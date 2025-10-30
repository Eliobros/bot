const { Client, RemoteAuth } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const ms = require('ms');

// --- Caminho do donoConfig e prefixo ---
const donoPath = path.join(__dirname, 'dono', 'dono.json');
global.donoConfig = JSON.parse(fs.readFileSync(donoPath));
global.prefixo = global.donoConfig.Prefixo || '!';
global.NumeroDono = global.donoConfig.NumeroDono || '';
global.nomeBot = global.donoConfig.NomeDoBot || 'Tina Bot';
global.NickDono = global.donoConfig.NickDono || 'Dono';

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
      if (!message.body.startsWith(global.prefixo)) return;

      const args = message.body.slice(global.prefixo.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();

      const command = client.commands.get(commandName);
      if (!command) return;

      try {
        console.log(`⚡ Executando comando: ${commandName}`);
        await command.execute(client, message, args);
      } catch (err) {
        console.error('❌ Erro ao executar comando:', err);
        await message.reply('❌ Ocorreu um erro ao executar o comando.');
      }
      //log da mewnsagem
      console.log(`💬 Mensagem de ${message.from}: ${message.body}`);

      //mandar prefixo
      if(message.body === 'prefixo') {
        await message.reply(`O prefixo atual é: ${global.prefixo}`);
      }

      if(message.body === 'bot'){
        await message.reply(`
          ah ${sender.name}, o que voce quer hein?
          `)
      }

      //se o comando nao existir 
      if(message.body.startsWith(global.prefixo) && !client.commands.has(commandName)){
        await message.reply(`❌ Comando não encontrado. Use ${global.prefixo}menu para ver a lista de comandos disponíveis.`);
      }

      //prefixo sem arqgumento
      if(message.body === global.prefixo){
        await message.reply(`❌ Você não digitou nenhum comando. Use ${global.prefixo}menu para ver a lista de comandos disponíveis.`);
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
    console.log(ms)
    client.initialize();

  })
  .catch(err => {
    console.error('❌ Erro ao conectar ao MongoDB:', err);
    process.exit(1);
  });