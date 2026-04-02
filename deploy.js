const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');
const config = require('./config.json');

const commands = [
  {
    name: 'painel',
    description: 'Enviar painel de tickets'
  },
  {
    name: 'painelwl',
    description: 'Enviar painel da whitelist'
  },
  {
    name: 'aprovar',
    description: 'Aprovar whitelist de um usuário',
    options: [
      {
        name: 'usuario',
        description: 'Usuário que será aprovado',
        type: ApplicationCommandOptionType.User,
        required: true
      }
    ]
  },
  {
    name: 'reprovar',
    description: 'Reprovar whitelist de um usuário',
    options: [
      {
        name: 'usuario',
        description: 'Usuário que será reprovado',
        type: ApplicationCommandOptionType.User,
        required: true
      }
    ]
  }
];

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log('Registrando comandos...');

    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands }
    );

    console.log('✅ Comandos registrados com sucesso.');
  } catch (error) {
    console.error('❌ Erro ao registrar comandos:', error);
  }
})();