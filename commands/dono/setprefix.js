const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'setprefix',
    description: 'Define um novo prefixo para os comandos do bot.',
    usage: '<novo_prefixo>',
    cooldown: 5,
    donoOnly: true,
    async execute(client, message, args) {
        try {
            // Pega o número de quem enviou (funciona em grupo e privado)
            const sender = message.author || message.from;
            const senderNumber = sender.replace('@c.us', '').replace('@s.whatsapp.net', '');

            // Verifica se é o dono
            if (!global.donoConfig.NumeroDono.includes(senderNumber)) {
                return message.reply(`❌ Apenas meu dono *${global.donoConfig.NickDono}* pode usar este comando.`);
            }

            // Valida argumentos
            if (args.length === 0) {
                return message.reply(`❌ Uso correto: ${global.prefixo}setprefix <novo_prefixo>\n\n*Exemplos:*\n• ${global.prefixo}setprefix !\n• ${global.prefixo}setprefix .\n• ${global.prefixo}setprefix /`);
            }

            const novoPrefixo = args[0];

            // Validações do novo prefixo
            if (novoPrefixo.length > 3) {
                return message.reply('❌ O prefixo deve ter no máximo 3 caracteres.');
            }

            if (novoPrefixo.includes(' ')) {
                return message.reply('❌ O prefixo não pode conter espaços.');
            }

            // Salva o prefixo antigo para a mensagem
            const prefixoAntigo = global.prefixo;

            // Atualiza o prefixo globalmente
            global.prefixo = novoPrefixo;

            // Atualiza o arquivo dono.json
            const donoPath = path.join(__dirname, '..', '..', 'dono', 'dono.json');
            global.donoConfig.Prefixo = novoPrefixo;
            fs.writeFileSync(donoPath, JSON.stringify(global.donoConfig, null, 2), 'utf8');

            return message.reply(`✅ *Prefixo atualizado com sucesso!*\n\n📝 Prefixo anterior: ${prefixoAntigo}\n✨ Novo prefixo: ${novoPrefixo}\n\n*Exemplo:* ${novoPrefixo}menu`);

        } catch (error) {
            console.error('❌ Erro no comando setprefix:', error);
            return message.reply('❌ Ocorreu um erro ao alterar o prefixo.');
        }
    }
}
