// ============================================
// commands/mozhost/vincular.js
// ============================================
const axios = require('axios');

module.exports = {
  name: 'vincular',
  description: 'Vincular conta MozHost ao WhatsApp',
  async execute(client, message, args) {
    try {
      const sender = message.from;
      
      // Formatar número (remover @c.us e adicionar 258 se necessário)
      let phoneNumber = sender.replace('@c.us', '');
      if (!phoneNumber.startsWith('258')) {
        phoneNumber = '258' + phoneNumber;
      }

      // Solicitar código ao backend
      const response = await axios.post('http://localhost:3001/api/whatsapp-link/request-code', {
        whatsappNumber: phoneNumber
      });

      const data = response.data;

      if (data.alreadyLinked) {
        return message.reply(
          `✅ *Sua conta já está vinculada!*\n\n` +
          `👤 Usuário: ${data.user.username}\n` +
          `💰 Coins: ${data.user.coins}\n\n` +
          `Use *${global.prefixo}menu* para ver os comandos disponíveis.`
        );
      }

      if (data.success) {
        await message.reply(
          `🔗 *VINCULAR CONTA MOZHOST*\n\n` +
          `Para vincular sua conta ao WhatsApp:\n\n` +
          `1️⃣ Acesse: https://mozhost.topaziocoin.online\n` +
          `2️⃣ Faça login na sua conta\n` +
          `3️⃣ Vá em *Configurações → Vincular WhatsApp*\n` +
          `4️⃣ Digite o código:\n\n` +
          `🔑 *${data.code}*\n\n` +
          `⏰ Código válido por 10 minutos`
        );
      } else {
        await message.reply(`❌ Erro ao gerar código. Tente novamente.`);
      }

    } catch (error) {
      console.error('Erro no comando vincular:', error);
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
        await message.reply(`❌ ${error.response.data.error || 'Erro ao processar vinculação'}`);
      } else if (error.request) {
        await message.reply(`❌ Servidor não respondeu. Tente novamente.`);
      } else {
        await message.reply(`❌ Erro ao processar vinculação. Tente novamente mais tarde.`);
      }
    }
  }
};
