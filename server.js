const { Client, RemoteAuth } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();
const ms = require('ms');

// --- Caminho do donoConfig e prefixo ---
const donoPath = path.join(__dirname, 'dono', 'dono.json');
global.donoConfig = JSON.parse(fs.readFileSync(donoPath));
global.prefixo = global.donoConfig.Prefixo || '!';
global.NumeroDono = global.donoConfig.NumeroDono || '';
global.nomeBot = global.donoConfig.NomeDoBot || 'Tina Bot';
global.NickDono = global.donoConfig.NickDono || 'Dono';

// --- Armazenamento de sessões de pagamento ---
const paymentSessions = new Map();

// --- Conexão com MongoDB ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Conectado ao MongoDB');

    // --- Inicialização do store ---
    const store = new MongoStore({ mongoose: mongoose });

    // Verificar se sessão existe
    store.sessionExists({ session: 'tina-bot' })
      .then(exists => {
        console.log('🔍 Sessão existe no MongoDB?', exists ? 'Sim ✅' : 'Não ❌');
      })
      .catch(err => {
        console.error('❌ Erro ao verificar sessão:', err);
      });

    // --- Inicialização do cliente WhatsApp ---
    const client = new Client({
      authStrategy: new RemoteAuth({
        clientId: 'tina-bot',
        store,
        backupSyncIntervalMs: 60000
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      }
    });

    // --- Carregar comandos ---
    client.commands = new Map();
    const commandFolders = fs.readdirSync(path.join(__dirname, 'commands'));
    for (const folder of commandFolders) {
      const commandFiles = fs.readdirSync(path.join(__dirname, 'commands', folder))
        .filter(file => file.endsWith('.js'));

      for (const file of commandFiles) {
        const command = require(path.join(__dirname, 'commands', folder, file));
        client.commands.set(command.name, command);
      }
    }
    console.log(`📦 ${client.commands.size} comandos carregados`);

    // --- Eventos do client ---
    client.on('qr', qr => {
      qrcode.generate(qr, { small: true });
      console.log('📸 Escaneie o QR Code acima para conectar o WhatsApp');
    });

    client.on('authenticated', () => {
      console.log('✅ Autenticação bem-sucedida!');
      console.log('📝 Sessão será salva no MongoDB...');
    });

    client.on('ready', () => {
      console.log('🤖 WhatsApp conectado com sucesso!');
      console.log('📱 Número:', client.info.wid.user);
      console.log('👤 Nome:', client.info.pushname);
    });

    client.on('loading_screen', (percent, message) => {
      console.log(`⏳ Carregando sessão: ${percent}% - ${message}`);
    });

    client.on('remote_session_saved', () => {
      console.log('💾 Sessão salva remotamente no MongoDB!');
    });

    client.on('change_state', state => {
      console.log('🔄 Estado do cliente:', state);
    });

    client.on('auth_failure', msg => {
      console.error('❌ Falha na autenticação:', msg);
    });

    client.on('disconnected', reason => {
      console.log('⚠️ Cliente desconectado:', reason);
    });

    // --- Evento de mensagem e execução de comandos ---
    client.on('message', async message => {
      const sender = message.from;
      
      // ===== PRIORIDADE 1: HANDLER DE FLUXO DE PAGAMENTO =====
      // Sempre verificar PRIMEIRO se há sessão ativa
      if (paymentSessions.has(sender)) {
        const session = paymentSessions.get(sender);
        
        // Etapa 1: Escolher pacote
        if (session.step === 'package') {
          const choice = parseInt(message.body.trim());
          if (isNaN(choice) || choice < 1 || choice > session.packages.length) {
            return message.reply(`❌ Opção inválida. Digite um número de 1 a ${session.packages.length}`);
          }
          
          session.selectedPackage = session.packages[choice - 1];
          session.step = 'method';
          paymentSessions.set(sender, session);
          
          return message.reply(
            `✅ Pacote selecionado: *${session.selectedPackage.coins} coins - ${session.selectedPackage.price} MT*\n\n` +
            `Escolha o método de pagamento:\n\n` +
            `1️⃣ *MPesa* (84/85)\n` +
            `2️⃣ *eMola* (86/87)\n\n` +
            `Digite *1* ou *2*:`
          );
        }
        
        // Etapa 2: Escolher método
        else if (session.step === 'method') {
          const choice = message.body.trim();
          if (choice !== '1' && choice !== '2') {
            return message.reply(`❌ Opção inválida. Digite *1* para MPesa ou *2* para eMola`);
          }
          
          session.method = choice === '1' ? 'mpesa' : 'emola';
          session.step = 'phone';
          paymentSessions.set(sender, session);
          
          const methodName = session.method === 'mpesa' ? 'MPesa' : 'eMola';
          const prefixes = session.method === 'mpesa' ? '84 ou 85' : '86 ou 87';
          
          return message.reply(
            `✅ Método: *${methodName}*\n\n` +
            `Digite seu número ${methodName}:\n` +
            `(Deve começar com ${prefixes})\n\n` +
            `Exemplo: 841234567`
          );
        }
        
        // Etapa 3: Número de telefone e processar pagamento
        else if (session.step === 'phone') {
          const phone = message.body.trim().replace(/\D/g, '');
          
          // Validar formato
          if (!/^(84|85|86|87)\d{7}$/.test(phone)) {
            return message.reply(`❌ Número inválido. Use formato: 84XXXXXXX, 85XXXXXXX, 86XXXXXXX ou 87XXXXXXX`);
          }
          
          // Validar compatibilidade
          const prefix = phone.substring(0, 2);
          if (session.method === 'mpesa' && !['84', '85'].includes(prefix)) {
            return message.reply(`❌ MPesa aceita apenas números 84/85. Reinicie com *${global.prefixo}pagamento*`);
          }
          if (session.method === 'emola' && !['86', '87'].includes(prefix)) {
            return message.reply(`❌ eMola aceita apenas números 86/87. Reinicie com *${global.prefixo}pagamento*`);
          }
          
          session.phone = phone;
          paymentSessions.delete(sender); // Limpar sessão
          
          // Processar pagamento
          await message.reply(
            `⏳ *Processando pagamento...*\n\n` +
            `Aguarde a confirmação.\n` +
            `Em até 3 segundos você receberá um popup no celular para validar a transação!`
          );
          
          try {
            // Buscar dados do usuário
            let whatsappNumber = sender.replace('@c.us', '');
            if (!whatsappNumber.startsWith('258')) whatsappNumber = '258' + whatsappNumber;
            
            const checkResponse = await fetch('http://localhost:3001/api/whatsapp-link/check-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ whatsappNumber })
            });
            const userData = await checkResponse.json();
            
            // Gerar token temporário
            const tokenResponse = await fetch('http://localhost:3001/api/auth/whatsapp-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: userData.user.id })
            });
            const tokenData = await tokenResponse.json();
            
            // Criar pagamento
            const paymentResponse = await fetch('http://localhost:3001/api/payment/create', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${tokenData.token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                packageId: session.selectedPackage.id,
                phone: session.phone,
                method: session.method
              })
            });
            
            const paymentData = await paymentResponse.json();
            
            if (paymentData.success) {
              if (paymentData.transaction.status === 'completed') {
                await message.reply(
                  `✅ *PAGAMENTO APROVADO!*\n\n` +
                  `💰 *${session.selectedPackage.coins} coins* adicionadas com sucesso!\n` +
                  `💎 Novo saldo: *${paymentData.newBalance} coins*\n\n` +
                  `🔖 ID da transação: ${paymentData.transaction.transactionId}\n\n` +
                  `Obrigado por usar MozHost! 🚀\n\n` +
                  `Use *${global.prefixo}saldo* para verificar seu saldo.`
                );
              } else {
                await message.reply(
                  `⏳ *Pagamento em processamento*\n\n` +
                  `📱 Valide a transação no popup do seu celular!\n\n` +
                  `Você receberá confirmação em breve.\n` +
                  `Use *${global.prefixo}saldo* para verificar.`
                );
              }
            } else {
              await message.reply(
                `❌ *Pagamento falhou*\n\n` +
                `Motivo: ${paymentData.message}\n\n` +
                `Tente novamente com *${global.prefixo}pagamento*`
              );
            }
            
          } catch (error) {
            console.error('Erro ao processar pagamento:', error);
            await message.reply(`❌ Erro ao processar pagamento. Tente novamente.`);
          }
          
          return; // Importante: retornar aqui!
        }
        
        return; // Não processar mais nada se estiver em fluxo de pagamento
      }

      // ===== PRIORIDADE 2: COMANDOS NORMAIS =====
      // Só executa se NÃO tiver sessão de pagamento ativa
      
      // Log da mensagem
      console.log(`💬 Mensagem de ${message.from}: ${message.body}`);

      // Comando "prefixo" (sem prefixo)
      if (message.body === 'prefixo') {
        return await message.reply(`O prefixo atual é: ${global.prefixo}`);
      }

      // Comando "bot" (sem prefixo)
      if (message.body === 'bot') {
        const contact = await message.getContact();
        return await message.reply(`Ah ${contact.pushname}, o que você quer hein?`);
      }

      // Se não começar com prefixo, ignora
      if (!message.body.startsWith(global.prefixo)) return;

      const args = message.body.slice(global.prefixo.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();

      const command = client.commands.get(commandName);

      // Prefixo sem argumento
      if (message.body === global.prefixo) {
        return await message.reply(
          `❌ Você não digitou nenhum comando.\n` +
          `Use *${global.prefixo}menu* para ver a lista de comandos disponíveis.`
        );
      }

      // Se comando não existir
      if (message.body.startsWith(global.prefixo) && !command) {
        return await message.reply(
          `❌ Comando não encontrado.\n` +
          `Use *${global.prefixo}menu* para ver a lista de comandos disponíveis.`
        );
      }

      // Executar comando
      if (command) {
        try {
          console.log(`⚡ Executando comando: ${commandName}`);
          await command.execute(client, message, args);
        } catch (err) {
          console.error('❌ Erro ao executar comando:', err);
          await message.reply('❌ Ocorreu um erro ao executar o comando.');
        }
      }
    });

    // --- Tratamento de erros não capturados ---
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
    });

    // --- Inicializar client ---
    console.log('🚀 Inicializando cliente WhatsApp...');
    client.initialize();

  })
  .catch(err => {
    console.error('❌ Erro ao conectar ao MongoDB:', err);
    process.exit(1);
  });
