const {
  Client,
  GatewayIntentBits,
  Collection
} = require('discord.js');

const config =
  require('./config/config');

const logger =
  require('./utils/logger');

const {
  GitHubDatabase
} = require('./database/githubDatabase');

const {
  ServerRepo
} = require('./database/repositories/serverRepo');

const {
  MemberRepo
} = require('./database/repositories/memberRepo');

const {
  CampaignRepo
} = require('./database/repositories/campaignRepo');

const {
  CheckpointRepo
} = require('./database/repositories/checkpointRepo');

const {
  LogRepo
} = require('./database/repositories/logRepo');

const {
  ServerService
} = require('./services/serverService');

const {
  MemberService
} = require('./services/memberService');

const {
  CampaignService
} = require('./services/campaignService');

const {
  CheckpointService
} = require('./services/checkpointService');

const {
  RecoveryService
} = require('./services/recoveryService');

const {
  QueueService
} = require('./services/queueService');

const {
  AnalyticsService
} = require('./services/analyticsService');

const {
  DMSimulator
} = require('./simulator/dmSimulator');

const {
  createDashboard
} = require('./dashboard/server');


// ========================================
// COMMAND FILES
// ========================================

const promoFiles = [
  'create',
  'preview',
  'start',
  'pause',
  'resume',
  'cancel',
  'recover',
  'status',
  'history',
  'test_dm'
];

const serverFiles = [
  'list',
  'stats'
];

const adminFiles = [
  'settings',
  'blacklist'
];


// ========================================
// LOAD COMMANDS
// ========================================

function loadCommands() {

  const commands =
    new Collection();


  // PROMO COMMANDS
  for (const name of promoFiles) {

    commands.set(
      `promo:${name}`,
      require(
        `./commands/promo/${name}`
      )
    );

  }


  // SERVER COMMANDS
  for (const name of serverFiles) {

    commands.set(
      `server:${name}`,
      require(
        `./commands/server/${name}`
      )
    );

  }


  // ADMIN COMMANDS
  for (const name of adminFiles) {

    commands.set(
      `admin:${name}`,
      require(
        `./commands/admin/${name}`
      )
    );

  }


  return commands;
}


// ========================================
// MAIN
// ========================================

async function main() {

  // ======================================
  // DATABASE
  // ======================================

  const db =
    new GitHubDatabase(config);

  await db.init();


  // ======================================
  // REPOSITORIES
  // ======================================

  const serverRepo =
    new ServerRepo(db);

  const memberRepo =
    new MemberRepo(db);

  const campaignRepo =
    new CampaignRepo(db);

  const checkpointRepo =
    new CheckpointRepo(db);

  const logRepo =
    new LogRepo(db);


  // ======================================
  // SERVICES
  // ======================================

  const serverService =
    new ServerService({
      serverRepo,
      memberRepo
    });


  const blacklistRepo = {

    list: () =>
      db.read(
        'blacklist.json'
      )

  };


  const memberService =
    new MemberService({
      memberRepo,
      blacklistRepo
    });


  const checkpointService =
    new CheckpointService({
      checkpointRepo
    });


  const campaignService =
    new CampaignService({
      campaignRepo,
      checkpointRepo,
      memberService,
      logRepo,
      checkpointService
    });


  // ======================================
  // SIMULATOR
  // ======================================

  const simulator =
    new DMSimulator({
      logRepo,
      blacklistRepo
    });


  // ======================================
  // QUEUE
  // ======================================

  const queueService =
    new QueueService({
      campaignService,
      memberService,
      logRepo,
      checkpointService,
      simulator,
      config
    });


  // ======================================
  // RECOVERY
  // ======================================

  const recoveryService =
    new RecoveryService({
      campaignRepo,
      checkpointService,
      queueService,
      logRepo
    });


  // ======================================
  // ANALYTICS
  // ======================================

  const analyticsService =
    new AnalyticsService({
      campaignRepo,
      logRepo,
      serverRepo
    });


  // ======================================
  // CONTEXT
  // ======================================

  const ctx = {

    config,

    db,

    serverRepo,

    memberRepo,

    campaignRepo,

    checkpointRepo,

    logRepo,

    serverService,

    memberService,

    checkpointService,

    campaignService,

    queueService,

    recoveryService,

    analyticsService,

    logger,

    settings:
      await db.read(
        'settings.json'
      )
  };


  // ======================================
  // DISCORD CLIENT
  // ======================================

  const client =
    new Client({

      intents: [

        GatewayIntentBits.Guilds,

        GatewayIntentBits.GuildMembers

      ]

    });


  // ======================================
  // COMMAND COLLECTION
  // ======================================

  const commands =
    loadCommands();


  ctx.client =
    client;


  // ======================================
  // READY EVENT
  // ======================================

  client.once(
    'ready',
    () => {

      require('./events/ready')(
        client,
        ctx
      ).catch(error => {

        logger.error(
          'Ready handler failed',
          {
            error: error.message,
            stack: error.stack
          }
        );

      });

    }
  );


  // ======================================
  // GUILD CREATE
  // ======================================

  client.on(
    'guildCreate',
    guild => {

      require('./events/guildCreate')(
        guild,
        ctx
      ).catch(error => {

        logger.error(
          'Guild registration failed',
          {
            error: error.message,
            stack: error.stack
          }
        );

      });

    }
  );


  // ======================================
  // INTERACTION CREATE
  // ======================================

  client.on(
    'interactionCreate',
    interaction => {

      require('./events/interactionCreate')(
        interaction,
        ctx,
        commands
      );

    }
  );


  // ======================================
  // DASHBOARD
  // ======================================

  const app =
    createDashboard(ctx);


  const http =
    app.listen(
      config.port,
      () => {

        logger.info(
          'Dashboard listening',
          {
            port: config.port
          }
        );

      }
    );


  // ======================================
  // GRACEFUL SHUTDOWN
  // ======================================

  let shuttingDown = false;


  async function shutdown(
    signal
  ) {

    if (shuttingDown) {
      return;
    }

    shuttingDown = true;


    logger.info(
      'Graceful shutdown requested',
      {
        signal
      }
    );


    queueService.requestShutdown();


    const deadline =
      Date.now() + 10000;


    while (
      (
        queueService.running ||
        queueService.active.size
      ) &&
      Date.now() < deadline
    ) {

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            100
          )
      );

    }


    http.close();


    client.destroy();


    logger.info(
      'Shutdown complete'
    );


    process.exit(0);

  }


  // ======================================
  // PROCESS SIGNALS
  // ======================================

  process.on(
    'SIGINT',
    () => shutdown('SIGINT')
  );

  process.on(
    'SIGTERM',
    () => shutdown('SIGTERM')
  );


  // ======================================
  // LOGIN
  // ======================================

  await client.login(
    config.discordToken
  );

}


// ========================================
// START APPLICATION
// ========================================

main().catch(error => {

  logger.error(
    'Fatal startup error',
    {
      error: error.message,
      stack: error.stack
    }
  );

  process.exit(1);

});
