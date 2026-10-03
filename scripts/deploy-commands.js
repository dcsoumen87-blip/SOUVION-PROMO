require('dotenv').config();
const {REST,Routes,SlashCommandBuilder,SlashCommandSubcommandBuilder}=require('discord.js');
const config=require('../src/config/config');
const promo=['create','preview','start','pause','resume','cancel','recover','status','history'];const server=['list','stats'];const admin=['settings','blacklist'];
function load(folder,names){return names.map(n=>require(`../src/commands/${folder}/${n}`).data.toJSON());}
function sub(data){return SlashCommandSubcommandBuilder.from(data);}
const promoGroup=new SlashCommandBuilder().setName('promo').setDescription('Manage educational promotion simulations');for(const d of load('promo',promo))promoGroup.addSubcommand(sub(d));
const serverGroup=new SlashCommandBuilder().setName('server').setDescription('View registered server data');for(const d of load('server',server))serverGroup.addSubcommand(sub(d));
const adminGroup=new SlashCommandBuilder().setName('admin').setDescription('Owner-only simulator administration');for(const d of load('admin',admin))adminGroup.addSubcommand(sub(d));
const commands=[promoGroup.toJSON(),serverGroup.toJSON(),adminGroup.toJSON()];
new REST({version:'10'}).setToken(config.discordToken).put(Routes.applicationCommands(config.clientId),{body:commands}).then(()=>console.log(`Deployed ${commands.length} top-level commands.`)).catch(e=>{console.error(e);process.exit(1);});
