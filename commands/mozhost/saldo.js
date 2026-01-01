// ============================================
// commands/mozhost/saldo.js
// ============================================
const axios = require('axios');

module.exports = {
  name: 'saldo',
  description: 'Ver saldo de coins',
  async execute(client, message, args) {
    try {
      const sender = message.from;
      let phoneNumber = sender.replace('@c.us', '');
      if (!phoneNumber.startsWith('258')) phoneNumber = '258' + phoneNumber;

      const response = await axios.post('http://localhost:3001/api/whatsapp-link/check-user', {
        whatsappNumber: phoneNumber
      });

      const data = response.data;

      if (!data.linked) {
        return message.reply(`❌ Conta não vinculada. Use *${global.prefixo}vincular*`);
      }

      await message.reply(
        `💰 *SEU SALDO*\n\n` +
        `👤 Usuário: ${data.user.username}\n` +
        `💎 Coins: *${data.user.coins}*\n` +
        `📦 Containers: ${data.user.maxContainers} máximo\n\n` +
        `Use *${global.prefixo}pagamento* para comprar mais coins!`
      );

    } catch (error) {
      console.error('Erro no comando saldo:', error);
      
      if (error.response) {
        await message.reply(`❌ ${error.response.data.error || 'Erro ao buscar saldo'}`);
      } else {
        await message.reply(`❌ Erro ao buscar saldo.`);
      }
    }
  }
};
