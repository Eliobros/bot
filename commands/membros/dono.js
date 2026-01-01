// commands/membros/dono.js
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'dono',
    aliases: ['owner', 'criador', 'dev'],
    description: 'Mostra o contato do dono do bot',
    usage: '',
    cooldown: 5,
    
    async execute(client, message, args) {
        try {
            // 1. Mensagem inicial
            await message.reply('📇 Aqui está o contato do meu dono!');
            
            await new Promise(r => setTimeout(r, 500));
            
            // 2. VCard básico
            const vcard = 
                'BEGIN:VCARD\n' +
                'VERSION:3.0\n' +
                'FN:👑 Zëüs - Dono do Bot\n' +
                'ORG:Alauda API;\n' +
                'TITLE:Desenvolvedor & Dono\n' +
                'TEL;type=CELL;type=VOICE;waid=258841617651:+258 84 161 7651\n' +
                'TEL;type=WORK:+258 86 284 0075\n' +
                'EMAIL:suporte@eliobrostech.topazioverse.com.br\n' +
                'EMAIL;type=WORK:contato@alaudaapi.topazioverse.com.br\n' +
                'URL:https://alauda-api.topazioverse.com.br\n' +
                'URL;type=GITHUB:https://github.com/lyncon\n' +
                'ADR;type=WORK:;;Av. Julius Nyerere;Maputo;;1100;Moçambique\n' +
                'NOTE:🚀 Criador da Alauda API | Bot Spotify | Desenvolvimento Web & APIs | Entre em contato para parcerias!\n' +
                'END:VCARD';
            
            // 3. Envia contato
            await message.reply(vcard);
            
            console.log(`📇 Contato do dono enviado para ${message.from}`);
            
        } catch (error) {
            console.error('❌ Erro ao enviar contato:', error);
            await message.reply('❌ Erro ao enviar contato. Tente novamente.');
        }
    }
};
