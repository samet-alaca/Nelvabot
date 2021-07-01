const config = require('./config.json');
let Discord = require('discord.js'),
Mysql = require('mysql'),
Ploty = require('plotly')(config.plotly.username, config.plotly.password),
fs = require('fs'),
Nelvabot = new Discord.Client(),
Data = new Map(),
Connection = Mysql.createConnection({
    host     : config.database.host,
    user     : config.database.user,
    password: config.database.password,
    database : config.database.name,
    supportBigNumbers: true,
    bigNumberStrings: true
}),
Typing = false,
Prefix = '/';

const pointsToValidate = new Map();
const child = require('child_process');

Nelvabot.login(config.discord.token);
Connection.connect((error) => { if(error) throw error; });

Nelvabot.on('ready', () => {
    Connection.query("SELECT * FROM nelvabot_settings", (error, results, fields) => {
        if(error) throw error;
        if(results.length > 0) {
            Nelvabot.user.setActivity(results[0].game);
            Nelvabot.user.setAvatar(results[0].avatar);
            Typing = results[0].typing;
            Prefix = results[0].prefix;
        } else {
            Nelvabot.user.setActivity("nelva.fr");
            Prefix = '/';
            Typing = false;
        }
    });
});

Nelvabot.on('message', (message) => {
    if(message.content.startsWith(Prefix, 0)) {
        let command = message.content.slice(1).split(' ');
        switch(command[0]) {
            case 'init': Nelvabot.init(message.channel); break;
            case 'stats': Nelvabot.stats(message.channel, command, message.mentions); break;
            case 'notify': Nelvabot.notify(message, command, message.content.slice(7)); break;
            case 'usage': Nelvabot.usage(message.channel, command); break;
            case 'bestiaire': Nelvabot.bestiaire(message, command); break;
            case 'find': Nelvabot.find(message, command); break;
            case 'reset': Nelvabot.stopTyping(message.channel); break;
            case 'update': Nelvabot.update(message.channel, message.guild); break;
            case 'rank': Nelvabot.rank(message, command); break;
            case 'channel': Nelvabot.channel(message, command); break;
            case 'process': Nelvabot.process(message, command); break;
            case 'point': Nelvabot.point(message, command); break;
            case 'help' : Nelvabot.help(message, command); break;
        }
    } else {
        if(!message.author.bot) {
            Nelvabot.count(message);
        }
    }
});

Nelvabot.on('messageReactionAdd', (reaction, user) => {
    const message = reaction.message.content.split('\n');
    if(reaction.message.author.id === '464085305453182986' && message.length > 4 && message[4].startsWith('POINTID-')) {
        const id = message[4].split('POINTID-')[1];
        if(pointsToValidate.has(id)) {
            const point = pointsToValidate.get(id);
            const lines = point.split('\n');
            const pseudo = lines[0].split('Pseudo : ')[1];
            const type = lines[1].split('Type : ')[1];
            const value = lines[2].split('Valeur : ')[1];
            const comment = lines[3].split('Message : ')[1];

            if(reaction.emoji.toString() === '👍') {
                Connection.query('INSERT INTO points (pseudo, points, type, message) VALUES (?, ?, ?, ?)', [pseudo, value, type, comment], (error, results) => {
                    if(!error) {
                        user.send('Validé !');
                    } else {
                        console.log(error);
                    }
                });
            } else {
                user.send('Refusé !');
            }

            pointsToValidate.delete(id);
        }
    }
});

let init = false;

Nelvabot.init = function(channel) {
    if(!init) {
        setTimeout(() => {
            channel.send('Init complete');
        }, 2000)
    } else {
        channel.send('Already set');
    }
}

Nelvabot.process = function(message, command) {
  if(command.indexOf('-status') != -1) {
    child.exec('pm2 ls', (error, stdout, stderr) => {
      if (error) {
        message.channel.send(stderr);
      } else {
        message.channel.send('```cpp\n' + stdout + '\n```');
        /*
        const start = stdout.indexOf('┌');
        const end = stdout.indexOf('Use `');
        if (start > -1 && end > -1) {
          message.channel.send('```cpp\n' + stdout.slice(start - 1, end - 1) + '\n```');
        } else if (stdout.length > 0) {
        }
        */
      }
    });
  } else {
    if(command.indexOf('-restart') != -1) {
      child.exec('pm2 restart ' + message.content.substr(message.content.indexOf('-restart') + 9), (error, stdout, stderr) => {
        if (error) {
          message.channel.send('```cpp\n' + stderr.slice(stderr.indexOf('[ERROR]'), stderr.length) + '\n```');
        } else {
          message.channel.send('```cpp\n' + stdout + '\n```');
          /*
          const start = stdout.indexOf('┌');
          const end = stdout.indexOf('Use `');
          if (start > -1 && end > -1) {
            message.channel.send('```cpp\n' + stdout.slice(start - 1, end - 1) + '\n```');
          } else if (stdout.length > 0) {
          }
          */
        }
      });
    }
  }
}

Nelvabot.channel = function(message, command) {
    let allowed = false;
    message.guild.members.get(message.author.id).roles.forEach((value, key) => {
        if(key == '281529716303986688' || key == '312221958110445571') {
            allowed = true;
        }
    });

    if(!allowed) {
        message.channel.send("Vous n'êtes pas autorisé à utiliser cette commande.");
    } else {
        if(command.indexOf('-create') != -1) {
            message.channel.guild.createChannel(message.content.substr(message.content.indexOf('-create') + 8))
            .catch((e) => {
                message.channel.send("RIP...\n" + e.getMessage())
            })
        }
        if(command.indexOf('-delete') !== -1) {
            if(channel = message.channel.guild.channels.find('name', message.content.substr(message.content.indexOf('-delete') + 8))) {
                channel.delete().catch((e) => {
                    message.channel.send("RIP...\n" + e.getMessage())
                })
            } else {
                message.channel.send('Channel '+ message.content.substr(message.content.indexOf('-delete') + 8) + ' pas trouvé :(')
            }
        }
    }
}

Nelvabot.stopTyping = function(channel) {
    channel.stopTyping();
}

Nelvabot.count = function(message) {
    if(value = Data.get(message.author.id)) {
        value.mess_count++;
        value.char_count += message.content.length;
    } else {
        let member = message.guild.members.find('id', message.author.id);
        Data.set(message.author.id, { mess_count: 1, char_count: message.content.length });
    }

    if(up = Data.get('update')) {
        if(Date.now() - up > 180000) {
            Nelvabot.post(message.channel, message.guild);
        }
    } else {
        Data.set('update', Date.now());
    }
}

Nelvabot.update = function(channel, guild) {
    Nelvabot.post(channel, guild);
}

Nelvabot.post = function(channel, guild) {
    let c = 0;
    Data.forEach((value, key) => {
        if(key != 'update') {
            c++;
            Connection.query("SELECT c_count, m_count FROM discord_stats WHERE user_id = ? AND date = CURDATE()", key, (error, results, fields) => {
                if(results !== undefined && results.length > 0) {
                    Connection.query("UPDATE discord_stats SET c_count = ?, m_count = ? WHERE user_id = ? AND date = CURDATE()", [results[0].c_count + value.char_count, results[0].m_count + value.mess_count, key]);
                } else {
                    Connection.query("INSERT INTO discord_stats (user_id, c_count, m_count, date) VALUES (?, ?, ?, CURDATE())", [key, value.char_count, value.mess_count]);
                }
            });
        }
    });
    Data.clear();
    Data.set('update', Date.now());
}

Nelvabot.stats = function(channel, command, mentions) {
    if(Typing) {
        channel.startTyping();
    }

    let periodOptions = {
        '-d': {
            sql: 'date = CURDATE()',
            output: "aujourd'hui"
        },
        '-y': {
            sql: 'date = SUBDATE(CURDATE(), INTERVAL 1 DAY)',
            output: "hier"
        },
        '-s': {
            sql: 'DATEDIFF(CURDATE(), date) < 7',
            output: 'cette semaine'
        },
        '-m': {
            sql: 'DATEDIFF(CURDATE(), date) < 31',
            output: "ce mois"
        },
        '-t': {
            sql: '1 = 1',
            output: "depuis que je suis là"
        }
    };

    let period = periodOptions['-d'];

    if(command.indexOf('-y') !== -1) period = periodOptions['-y'];
    else if(command.indexOf('-s') !== -1) period = periodOptions['-s'];
    else if(command.indexOf('-m') !== -1) period = periodOptions['-m'];
    else if(command.indexOf('-t') !== -1) period = periodOptions['-t'];

    let output = "",
    data = new Array(),
    users = new Array(),
    char_count = (command.indexOf('-c') !== -1),
    list = command.indexOf('-list') !== -1,
    chart = ((command.indexOf('-chart') !== -1) || (command.indexOf('-graph') !== -1));

    if(mentions) {
        for(var user of mentions.users.array()) {
            if(users.indexOf(user.id) == -1) {
                users.push(user.id);
            }
        }
        for(var user of mentions.roles.array()) {
            if(users.indexOf(user.id) == -1) {
                users.push(user.id);
            }
        }
    }

    if(list) {
        if(users.length == 0) {
            Connection.query("SELECT username, SUM(c_count) as char_count, SUM(m_count) AS messages FROM discord_stats, discord_users WHERE user_id = user AND " + period.sql + " GROUP BY user_id ORDER BY messages DESC", (error, results) => {
                if(results.length > 0) {
                    if(char_count) {
                        for(var result of results) {
                            output += result.username + " a posté " + result.char_count + " caractères " + period.output + ".\n";
                        }
                    } else {
                        for(var result of results) {
                            output += result.username + " a posté " + result.messages + " messages " + period.output + ".\n";
                        }
                    }
                } else {
                    output = "Aucun résultat.";
                }
                channel.send(output);
            });
        } else {
            for(var user of users) {
                var sql = "SELECT username, SUM(m_count) AS messages FROM discord_stats, discord_users WHERE user_id = user AND " + period.sql + " AND user_id = " + user;
                Connection.query("SELECT username, SUM(c_count) as char_count, SUM(m_count) AS messages FROM discord_stats, discord_users WHERE user_id = user AND " + period.sql + " AND user_id = ?", [user], (error, results) => {
                    if(results.length > 0) {
                        if(char_count) {
                            channel.send(results.username + " a posté " + result.char_count + " caractères " + period.output + ".\n");
                        } else {
                            channel.send(results.username + " a posté " + result.messages + " messages " + period.output + ".\n");
                        }
                    } else {
                        channel.send("Aucune donnée pour <@" + user + ">\n");
                    }
                });
            }
            channel.stopTyping();
        }
    } else if(chart) {
        let trace = {
            x: [],
            y: [],
            type: "scatter"
        }, imgOptions = {
            format: 'png',
            width: 600,
            height: 400
        };

        if(!(period == periodOptions['-d'] || period == periodOptions['-y'])) {
            if(users.length == 0) {
                var sql = "SELECT date, SUM(m_count) AS messages, SUM(c_count) AS c_count FROM discord_stats WHERE " + period.sql + " GROUP BY date";
            } else {
                var sql = "SELECT date, SUM(m_count) AS messages, SUM(c_count) AS c_count FROM discord_stats WHERE " + period.sql + " AND (";
                let i = 0;
                for(var user of users) {
                    sql += " user_id = " + user;
                    if(i < users.length - 1) {
                        sql += " OR ";
                    }
                    i++;
                }
                sql += ") GROUP BY date";
            }
            Connection.query(sql, (error, results) => {
                if(results !== undefined && results.length > 0) {
                    for(var result of results) {
                        trace.x.push(result.date);
                        if(!char_count) {
                            trace.y.push(result.messages);
                        } else {
                            trace.y.push(result.c_count);
                        }
                    }
                    Ploty.getImage({ 'data': [trace] }, imgOptions, (error, imgStream) => {
                        if(error) throw error;
                        imgStream.pipe(fs.createWriteStream('./assets/chart.png'));
                        channel.sendFile(imgStream);
                        channel.stopTyping();
                    });
                } else {
                    channel.send("Aucun résultat.");
                    channel.stopTyping();
                }
            });
        } else {
            channel.send("Vous ne pouvez pas obtenir de graph sur des périodes de 24h (pour l'instant)");
        }
    } else {
        if(users.length == 0) {
            Connection.query("SELECT SUM(m_count) AS messages, SUM(c_count) AS c_count FROM discord_stats WHERE " + period.sql, function(error, results, fields) {
                if(results !== undefined && results.length > 0) {
                    if(!char_count) {
                        channel.send(results[0].messages + " messages ont été postés " + period.output);
                    } else {
                        channel.send(results[0].c_count + " caractères ont été postés " + period.output);
                    }
                    channel.stopTyping();
                } else {
                    channel.send("Aucun résultat.");
                    channel.stopTyping();
                }
            });
        } else {
            let sql = "SELECT SUM(m_count) AS messages, SUM(c_count) AS c_count FROM discord_stats WHERE " + period.sql + " AND (";
            let i = 0;
            for(var user of users) {
                sql += " user_id = " + user;
                if(i < users.length - 1) {
                    sql += " OR ";
                }
                i++;
            }
            sql += ")";
            Connection.query(sql, (error, results) => {
                if(results !== undefined && results.length > 0) {
                    if(!char_count) {
                        channel.send(results[0].messages + " messages ont été postés par ces utilisateurs " + period.output);
                    } else {
                        channel.send(results[0].c_count + " caractères ont été postés par ces utilisateurs " + period.output);
                    }
                    channel.stopTyping();
                } else {
                    channel.send("Aucun résultat.");
                    channel.send("Requête envoyée : " + sql);
                    channel.stopTyping();
                }
            });
        }
    }
};

Nelvabot.notify = function(message, command, content) {
    if(Typing) {
        message.channel.startTyping();
    }

    let allowed = false;
    const gouv = message.member.roles.get('281529716303986688');
    message.channel.send('Gouvernement : ' + Boolean(gouv));

    if(gouv || message.author.id === '464085305453182986') {
        allowed = true;
    }

    if(!allowed) {
        message.channel.send("Vous n'êtes pas autorisé à utiliser cette commande.");
        message.channel.stopTyping();
    } else {
        var username = (message.author.nickname == undefined) ? message.author.username : message.author.nickname;
        if(message.content.indexOf('-message=') == -1) {
            message.channel.send("Vous devez spécifier le message à envoyer avec '-message='");
            message.channel.stopTyping();
        } else {
            let content = message.content.substr(message.content.indexOf('-message=') + 9);
            content += "\n\t - De la part de " + username;

            if(message.mentions.everyone) {
                for(var user of message.guild.members.array()) {
                    user.send(content);
                }
            } else {
                if(message.mentions.roles.size > 0) {
                    for(var role of message.mentions.roles.array()) {
                        for(var user of role.members.array()) {
                            user.send(content);
                        }
                    }
                    for(var user of message.mentions.users.array()) {
                        user.send(content);
                    }
                } else {
                    let role = message.content.substr(message.content.indexOf('-role=') + 6, message.content.indexOf('-message=') - 15);
                    for(var user of message.guild.roles.find(elem => elem.id === role).members.array()) {
                        user.send(content);
                    }
                }
            }

            message.channel.send("Tous les utilisateurs concernés ont été notifiés. :incoming_envelope:");
            message.channel.stopTyping();
            message.delete();
        }
    }
}

Nelvabot.bestiaire = function(message, command) {
    var author = message.author.username;
    var content = message.content.substr(11);
    var pseudo = "";
    var msg = "";

    if(content.indexOf('-delete=') !== -1) {
        id = content.substring(8);
        Connection.query("SELECT pseudo FROM bestiaire WHERE id = ?", [id], (error, results) => {
            if(results !== undefined && results.length > 0) {
                Connection.query("DELETE FROM bestiaire WHERE id = ?", [id]);
                message.channel.send("Nouvelle liste pour ce joueur : \n");
                Connection.query("SELECT * FROM bestiaire WHERE pseudo = ?", [results[0].pseudo], (error, results) => {
                    if(results !== undefined && results.length > 0) {
                        for(var result of results) {
                            message.channel.send("\""+ result.message+"\" par " + result.author + " le " + result.date + " - (id : " + result.id + ")");
                        }
                    } else {
                        message.channel.send("Aucun résultat.");
                    }
                });
            } else {
                message.channel.send("Aucune entrée pour cet id");
            }
        });
    } else {
        if(content.indexOf('-pseudo=') !== -1) {
            pseudo = content.substring(8, content.indexOf('-message=') - 1);
            if(content.indexOf('-message=') !== -1) {
                msg = content.substring(content.indexOf('-message=') + 9);
                if(msg.length < 1 || pseudo.length < 1) {
                    message.channel.send("Sérieusement ?");
                } else {
                    Connection.query("INSERT INTO bestiaire (pseudo, message, author, date) VALUES (?, ?, ?, ?)", [pseudo, msg, author, date_format(new Date())]);

                    var output = "Nouvelle liste pour ce joueur : \n";
                    Connection.query("SELECT * FROM bestiaire WHERE pseudo = ?", [pseudo], (error, results) => {
                        if(results !== undefined && results.length > 0) {
                            for(var result of results) {
                                message.channel.send("\""+ result.message+"\" par " + result.author + " le " + result.date + " - (id : " + result.id + ")");
                            }
                        } else {
                            message.channel.send("Aucun résultat.");
                        }
                    });
                    message.channel.send(output);
                }
            } else {
                message.channel.send("Vous devez spécifier le message avec '-message=.......'");
            }
        } else {
            if(content.indexOf('-find=') !== -1) {
                var pseudo = content.substr(content.indexOf('-find=') + 6);
                if(pseudo != '*') {
                    Connection.query("SELECT * FROM bestiaire WHERE pseudo = ?", [pseudo], (error, results) => {
                        if(results !== undefined && results.length > 0) {
                            for(var result of results) {
                                message.channel.send("\""+ result.message+"\" par " + result.author + " le " + result.date + " - (id : " + result.id + ")");
                            }
                        } else {
                            message.channel.send("Aucun résultat.");
                        }
                    });
                } else {
                    Connection.query("SELECT DISTINCT pseudo FROM bestiaire ORDER BY pseudo ASC", (error, results) => {
                        if(results !== undefined && results.length > 0) {
                            var output = "-----\n";
                            const splits = [];
                            for(var result of results) {
                                if(output.length > 1800) {
                                    splits.push(JSON.parse(JSON.stringify(output)));
                                    output = "-----\n";
                                }
                                output += " -> " + result.pseudo + "\n";
                            }
                        
                            if(splits.length > 0) {
                                //const splits = output.match(/.{1,1800}/gm);
                                for(let i = 0; i < splits.length; i++) {
                                    setTimeout(() => message.channel.send(splits[i]), i * 300);
                                }
                            } else {
                                message.channel.send(output);
                            }
                            // message.channel.send(output);
                        } else {
                            message.channel.send("Aucun résultat.");
                        }
                    });
                }
            } else {
                message.channel.send("Vous devez spécifier le pseudo avec '-pseudo=.......'");
            }
        }
    }
}

Nelvabot.getAvgRank = function(rank) {
    var sum = rank.m + rank.d + rank.e + rank.l;
    var r = 5;
    if(sum < 18) { r = 4; }
    if(sum < 15) { r = 3; }
    if(sum < 10) { r = 2; }
    if(sum < 6) { r = 1; }
    return r;
}

Nelvabot.rank = function(message, command) {
    var content = message.content.slice(6);
    var user = (message.mentions) ? message.mentions.users.array()[0] : null;

    var allowed = false;
    var changed = false;
    var dispRuban = false;
    var setRuban = 0;

    message.guild.members.get(message.author.id).roles.forEach((value, key) => {
        if(key == '281529716303986688') {
            allowed = true;
        }
    });

    if(user == null) {
        message.channel.send("Vous devez mentionner un utilisateur pour que je sache de qui on parle. Désolé.");
    } else {
        var rank;
        Connection.query("SELECT m,d,e,l,i, setting, username FROM rangs, discord_users WHERE id = user AND id = ?", user.id, (error, results, fields) => {
            if(results !== undefined && results.length > 0) {
                rank = {
                    m: results[0].m,
                    d: results[0].d,
                    e: results[0].e,
                    l: results[0].l,
                    i: results[0].i
                };
            } else {
                rank = {m:5,e:5,d:5,l:5,i:5};
            }

            if(content.indexOf('-setdefault') !== -1) {
                rank = {m:5,e:5,d:5,l:5,i:5};
                changed = true;
            }

            if(content.indexOf('m=') !== -1) {
                rank.m = parseInt(content.substr(content.indexOf('m=') + 2, 1));
                changed = true;
            }

            if(content.indexOf('d=') !== -1) {
                rank.d = parseInt(content.substr(content.indexOf('d=') + 2, 1));
                changed = true;
            }

            if(content.indexOf('e=') !== -1) {
                rank.e = parseInt(content.substr(content.indexOf('e=') + 2, 1));
                changed = true;
            }

            if(content.indexOf('l=') !== -1) {
                rank.l = parseInt(content.substr(content.indexOf('l=') + 2, 1));
                changed = true;
            }

            if(content.indexOf('i=') !== -1) {
                rank.i = parseInt(content.substr(content.indexOf('i=') + 2, 1));
                changed = true;
            }

            if(content.indexOf('-ruban=') !== -1) {
                setRuban = parseInt(content.substr(content.indexOf('-ruban=') + 7, 1));
            }

            if(content.indexOf('-get') !== -1) {
                var output = "Rangs de " + results[0].username + " : \n";
                output += "\tMilitaire : " + rank.m + "\n";
                output += "\tEconomique : " + rank.e + "\n";
                output += "\tDiplomatique : " + rank.d + "\n";
                output += "\tLeadership : " + rank.l + "\n";
                output += "\tImplication : " + rank.i + "\n";

                output += "\nRang Moyen : " + Nelvabot.getAvgRank(rank) + ", ruban : \n";
                dispRuban = true;
                changed = false;
            }

            if(changed) {
                if(!allowed) {
                    message.channel.send("Vous n'êtes pas autorisés à utiliser cette commande.");
                } else {
                    if(rank.m == NaN || rank.d == NaN || rank.e == NaN || rank.l == NaN || rank.i == NaN) {
                        message.channel.send("Impossible de parser le message.");
                    } else {
                        if(rank.m < 1 || rank.m > 5 || rank.d < 1 || rank.d > 5 || rank.e < 1 || rank.e > 5 || rank.l < 1 || rank.l > 5 || rank.i < 1 || rank.i > 5){
                            message.channel.send("Les rangs doivent être compris entre 1 et 5");
                        } else {
                            if(results !== undefined && results.length > 0) {
                                sql = "UPDATE rangs SET m = ?, d = ?, e = ?, l = ?, i = ? WHERE id = ?";
                                params = [rank.m,rank.d,rank.e,rank.l,rank.i,user.id];
                            } else {
                                sql = "INSERT INTO rangs (id, m, d, e, l, i) VALUES (?, ?, ?, ?, ?, ?)";
                                params = [user.id, rank.m, rank.d, rank.e, rank.l, rank.i];
                            }
                            Connection.query(sql, params, (e,r) => {

                                Connection.query("SELECT m,d,e,l,i, setting, username FROM rangs, discord_users WHERE id = user AND id = ?", user.id, (error, results, fields) => {
                                    if(results !== undefined && results.length > 0) {
                                        rank = {
                                            m: results[0].m,
                                            d: results[0].d,
                                            e: results[0].e,
                                            l: results[0].l,
                                            i: results[0].i
                                        };

                                        var output = "Rangs de " + results[0].username + " changés pour : \n";
                                        output += "\tMilitaire : " + rank.m + "\n";
                                        output += "\tEconomique : " + rank.e + "\n";
                                        output += "\tDiplomatique : " + rank.d + "\n";
                                        output += "\tLeadership : " + rank.l + "\n";
                                        output += "\tImplication : " + rank.i + "\n\n";
                                        output += "\nRang : " + Nelvabot.getAvgRank(rank) + ", ruban : \n";
                                        message.channel.send(output);
                                        message.channel.sendFile('./assets/' + results[0].setting + '/' + Nelvabot.getAvgRank(rank) + "-" + rank.i + ".jpg");
                                        var u = message.guild.members.get(user.id);
                                        u.removeRoles(['411619433581248532', '411619408415555585', '411619385363660801', '411619308158976011', '411619275241947136']);
                                        setTimeout(() => {
                                            switch(Nelvabot.getAvgRank(rank)) {
                                                case 1: u.addRole('411619433581248532'); break;
                                                case 2: u.addRole('411619408415555585'); break;
                                                case 3: u.addRole('411619385363660801'); break;
                                                case 4: u.addRole('411619308158976011'); break;
                                                case 5: u.addRole('411619275241947136'); break;
                                            }
                                        }, 1000);
                                    }
                                });
                            });
                        }
                    }
                }
            } else {
                if(setRuban != 0 && ((user.id == message.author.id) || allowed)) {
                    if(setRuban > 0 && setRuban < 5) {
                        Connection.query("UPDATE rangs SET setting = ? WHERE id = ?", [setRuban, user.id]);
                        message.channel.send("Ruban sauvegardé avec succès.");
                    } else {
                        message.channel.send("Impossible de parser. Réessayez. (1 militaire, 2 economie, 3 diplomatie, 4 leadership)");
                    }
                } else {
                    message.channel.send(output);
                    if(dispRuban) {
                        message.channel.sendFile('./assets/' + results[0].setting + '/' + Nelvabot.getAvgRank(rank) + "-" + rank.i + ".jpg");
                    }
                }
            }
        });
    }
}

function date_format(date) {
    return str_pad_left(date.getDate(), '0', 2) +
    "/" + str_pad_left((date.getMonth() + 1), '0', 2) +
    "/" + date.getFullYear();
}

function str_pad_left(string, pad, length) {
    return (new Array(length+1).join(pad)+string).slice(-length);
}

Nelvabot.find = function(message, command) {
    var pseudo = "";
    var content = message.content.slice(6);

    if(content.indexOf('-pseudo') !== -1) {
        pseudo = content.substr(8);
        Connection.query("SELECT * FROM bestiaire WHERE pseudo = ?", [pseudo], (error, results) => {
            if(results !== undefined && results.length > 0) {
                for(var result of results) {
                    message.channel.send("\""+ result.message+"\" par " + result.author + " le " + result.date + " - (id : " + result.id + ")");
                }
            } else {
                message.channel.send("Aucun résultat.");
            }
        });
    } else {
        if(content.indexOf('-all') !== -1) {
            Connection.query("SELECT DISTINCT pseudo FROM bestiaire ORDER BY pseudo ASC", (error, results) => {
                if(results !== undefined && results.length > 0) {
                    var output = "";
                    for(var result of results) {
                        output += " -> " + result.pseudo + "\n";
                    }
                    message.channel.send(output);
                } else {
                    message.channel.send("Aucun résultat.");
                }
            });
        } else {
            message.channel.send("Vous devez spécifier le pseudo avec '-pseudo=.......'");
        }
    }
}

Nelvabot.usage = function(channel, command) {
    if(Typing) {
        channel.startTyping();
    }
    try {
        channel.sendFile('./assets/' + command[1] + '.png');
    } catch(e) {
        channel.send("Impossible de charger l'aide pour cette commande...");
    }
    channel.stopTyping();
};

Nelvabot.point = function(message, command) {
    const author = message.author.username;
    const content = message.content.substr(5);
    const maisons = [
        {
            name: 'Dragon',
            id: '558641509516312576'
        },
        {
            name: 'Phénix',
            id: '558641862349553675'
        },
        {
            name: 'Griffon',
            id: '558642362906181644'
        },
        {
            name: 'Lion',
            id: '558641693721755657'
        }
    ];

    for(var user of message.mentions.members.array()) {
        // si citoyen
        if(user.roles.get('281540700556754944')) {
            const parts = content.split(' ');

            let type = parts.find(e => e.startsWith('-type='));
            if(!type) {
                message.channel.send("Commande invalide, type non spécifié");
                return;
            }

            let value = parts.find(e => e.startsWith('-valeur='));
            if(!value) {
                message.channel.send("Commande invalide, valeur non spécifiée");
                return;
            }

            let comment = content.substr(content.indexOf('-message=') + 9);
            if(!comment) {
                message.channel.send("Commande invalide, message non spécifié");
                return;
            }

            type = type.substr(6);
            value = value.substr(8);
            const pseudo = user.user.username;

            let maison = null;
            for(const m of maisons) {
                if(user.roles.get(m.id)) {
                    maison = m;
                }
            }

            Connection.query('SELECT * FROM maisons WHERE maison_id = ?', [maison.id], (error, results) => {
                if(error) {
                    console.log(error);
                } else { 
                    if(results !== undefined && results.length > 0) {
                        const chef = message.guild.members.array().find(e => e.id === results[0].chef_id);
                        const id = (Math.random() * Date.now()).toString(36);

                        let output = 'Pseudo : ' + pseudo + '\n';
                        output += 'Type : ' + type + '\n';
                        output += 'Valeur : ' + value + '\n';
                        output += 'Message : ' + comment + '\n';
                        output += 'POINTID-' + id + '\n';
                        output += 'Valider avec :thumbsup:, refuser avec :thumbsdown:';

                        pointsToValidate.set(id, output);

                        chef.send(output);
                    }
                }
            });
        }
    }
}

Nelvabot.help = function(message, command)
{
    const content = message.content;
    if(content.indexOf('/help') !== -1 && content.length == 5)
    {
        const embed = new Discord.MessageEmbed()
        .setColor('#007EC7')
        .setTitle("Page d'aide NelvaBot")
        .addFields(
            { name: 'Bestiaire', value: '`/bestiaire -find=`', inline: true },
            { name: '', value: '`/bestiaire -pseudo= -message=`', inline: true },
            { name: '', value: '`/bestiaire -delete=`', inline: true },
            { name: '\u200b', value: '\u200b'},
            { name: "Points de maison", value: '`/point -type= -valeur= -message=`'},
        )
        .setFooter('Demandé par' + message.author.username, message.author.displayAvatarURL())

        message.channel.send({embed});        
    }
    if(content.indexOf('bestiaire') !== -1)
    {
        const embed = new DiscordMessageEmbed()
        .setColor('#007EC7')
        .setTitle("Bestiaire")
        .setDescription('`/bestiaire`')
        .addFields(
            { name: 'Ajouter un message', value: '`-pseudo=<pseudo du joueur>\n-message=<message>`' },
            { name: '\u200b', value: '\u200b'},
            { name: 'Supprimer un message', value: '`-delete=<ID du message>`' },
            { name: '\u200b', value: '\u200b'},
            { name: "Points de maisonTrouver tous les messages pour un joueur", value: '`-find=<pseudo du joueur>`'},
            { name: '\u200b', value: '\u200b'},
            { name: 'Exemples', value: '`/bestiaire -pseudo=Samet -message=Test\n/bestiaire -delete=13\n/bestiaire -find=RedClash\n/bestiaire -find=*`' },
        )
        .setFooter('Demandé par' + message.author.username, message.author.displayAvatarURL())

        message.channel.send({embed});
    }
    if(content.indexOf('point') !== -1)
    {
        const embed = new DiscordMessageEmbed()
        .setColor('#007EC7')
        .setTitle("Points de maison")
        .setDescription('`/point`')
        .addFields(
            { name: 'Donner des points', value: '`-pseudo=<pseudo du joueur> -type=<type de point> -valeur=<nombre de points> -message=<justification>`' },
            { name: '\u200b', value: '\u200b'},
            { name: 'Exemples', value: '`/point -pseudo=Pepprer -type=Vaillance -valeur=10 -message=Combat contre un gmeur`' },
        )
        .setFooter('Demandé par' + message.author.username, message.author.displayAvatarURL())

        message.channel.send({embed});
    }
}   