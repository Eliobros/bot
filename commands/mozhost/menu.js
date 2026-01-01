// ============================================
// commands/mozhost/menu.js
// ============================================
module.exports = {
  name: 'menu',
  description: 'Menu de comandos MozHost',
  async execute(client, message, args) {
    const menu = 
      `╭═══════════════════╮\n` +
      `│   🤖 *${global.nomeBot}*\n` +
      `╰═══════════════════╯\n\n` +
      
      `*💰 MOZHOST*\n` +
      `${global.prefixo}vincular - Vincular conta\n` +
      `${global.prefixo}saldo - Ver seus coins\n` +
      `${global.prefixo}pagamento - Comprar coins\n` +
      `${global.prefixo}containers - Listar containers\n\n` +
      
      `*ℹ️ INFO*\n` +
      `${global.prefixo}ping - Verificar bot\n` +
      `${global.prefixo}dono - Info do dono\n\n` +
      
      `━━━━━━━━━━━━━━━━━\n` +
      `👤 Dono: ${global.NickDono}`;

    await message.reply(menu);
  }
};
