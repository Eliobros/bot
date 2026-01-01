// ============================================
// commands/mozhost/containers.js
// ============================================
const axios = require('axios');

module.exports = {
  name: 'containers',
  description: 'Listar seus containers',
  async execute(client, message, args) {
    try {
      const sender = message.from;
      let phoneNumber = sender.replace('@c.us', '');
      if (!phoneNumber.startsWith('258')) phoneNumber = '258' + phoneNumber;

      // Verificar vinculação
      const checkResponse = await axios.post('http://localhost:3001/api/whatsapp-link/check-user', {
        whatsappNumber: phoneNumber
      });

      const userData = checkResponse.data;
      
      if (!userData.linked) {
        return message.reply(`❌ Conta não vinculada. Use *${global.prefixo}vincular*`);
      }

      // Buscar containers (precisa criar token JWT pro usuário)
      // Por enquanto, vou simular - você precisa implementar geração de token
      
      await message.reply(
        `📦 *SEUS CONTAINERS*\n\n` +
        `⚠️ Funcionalidade em desenvolvimento.\n\n` +
        `Em breve você poderá:\n` +
        `• Ver lista de containers\n` +
        `• Iniciar/Parar containers\n` +
        `• Ver logs e status`
      );

    } catch (error) {
      console.error('Erro no comando containers:', error);
      
      if (error.response) {
        await message.reply(`❌ ${error.response.data.error || 'Erro ao buscar containers'}`);
      } else {
        await message.reply(`❌ Erro ao buscar containers.`);
      }
    }
  }
};
