// ============================================
// commands/mozhost/pagamento.js
// ============================================
const axios = require('axios');

// Armazenar estado da conversa
const paymentSessions = new Map();

module.exports = {
  name: 'pagamento',
  description: 'Comprar coins MozHost',
  async execute(client, message, args) {
    try {
      const sender = message.from;
      let phoneNumber = sender.replace('@c.us', '');
      if (!phoneNumber.startsWith('258')) phoneNumber = '258' + phoneNumber;

      // Verificar se está vinculado
      const checkResponse = await axios.post('http://localhost:3001/api/whatsapp-link/check-user', {
        whatsappNumber: phoneNumber
      });

      const userData = checkResponse.data;

      if (!userData.linked) {
        return message.reply(
          `❌ Sua conta não está vinculada!\n\n` +
          `Use *${global.prefixo}vincular* para começar.`
        );
      }

      // Buscar pacotes
      const packagesResponse = await axios.get('http://localhost:3001/api/payment/packages');
      const packagesData = packagesResponse.data;

      const packagesList = packagesData.packages.map((pkg, index) =>
        `${index + 1}️⃣ *${pkg.coins} coins* - ${pkg.price} MT`
      ).join('\n');

      await message.reply(
        `💰 *COMPRAR COINS*\n\n` +
        `Escolha um pacote:\n\n` +
        `${packagesList}\n\n` +
        `Digite o número do pacote desejado:`
      );

      // Salvar estado
      paymentSessions.set(sender, {
        step: 'package',
        userId: userData.user.id,
        packages: packagesData.packages
      });

      // Auto-limpar após 5 minutos
      setTimeout(() => paymentSessions.delete(sender), 5 * 60 * 1000);

    } catch (error) {
      console.error('Erro no comando pagamento:', error);
      await message.reply(`❌ Erro ao processar. Tente novamente.`);
    }
  }
};
