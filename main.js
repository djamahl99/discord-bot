var Discord = require('discord.io');
var auth = require('./auth.json');
var request = require("request");
var mysql = require('mysql');
var http = require('http');
var https = require('https');
var fs = require('fs');
var authedUsers = ["339707676172877827", "99508168073150464"];
var magic = ['ffd8fffe', 'ffd8ffdb', 'ffd8ffdb', 'ffd8ffe0', 'ffd8ffe1', '89504e47', '47494638', 'ffd8ffe2', '89504E47'];

process.on('uncaughtException', function (err) {
    console.log("uncaughtException");
    console.log(err);
  console.error(err.stack);
  console.log("Node NOT Exiting...");
});

var fmkey = auth.fmKey,
    gooogleKey = auth.googleKey;
    
var con = mysql.createConnection({
  host     : auth.mysql.host,
  user     : auth.mysql.user,
  password : auth.mysql.password,
  database : auth.mysql.database
});
 
con.connect(function(err) {
  if (err) throw 'mysql err ' + err;
  console.log('MySql Connected!');
});

//create rym table
con.query("SELECT 1 FROM `rym` LIMIT 1;", function (err, result, fields) {
    if(err) {
        console.log("Creating RYM table.");
        var sql = "CREATE TABLE `discord-bot`.`rym` ( `id` INT(11) NOT NULL AUTO_INCREMENT , `discordId` VARCHAR(255) NOT NULL , `username` TEXT NOT NULL , PRIMARY KEY (`id`), UNIQUE (`discordId`)) ENGINE = InnoDB;";
        con.query(sql, function (err, result, fields) {
            if(err) {
                console.log("Table could not be created! Error: " + err);
            } else {
                console.log("Successfully created table.");
            }
        });
    }
});

//create chart table
con.query("SELECT 1 FROM `chart` LIMIT 1;", function (err, result, fields) {
    if(err) {
        console.log("Creating chart table.");
        var sql = "CREATE TABLE `discord-bot`.`chart` ( `id` INT(11) NOT NULL AUTO_INCREMENT , `discordId` VARCHAR(255) NOT NULL , `chartlink` TEXT NOT NULL , PRIMARY KEY (`id`), UNIQUE (`discordId`)) ENGINE = InnoDB;";
        con.query(sql, function (err, result, fields) {
            if(err) {
                console.log("Table could not be created! Error: " + err);
            } else {
                console.log("Successfully created table.");
            }
        });
    }
});

//create fm table
con.query("SELECT 1 FROM `last fm` LIMIT 1;", function (err, result, fields) {
    if(err) {
        console.log("Creating fm table.");
        var sql = "CREATE TABLE `discord-bot`.`last fm` ( `id` INT(11) NOT NULL AUTO_INCREMENT , `username` VARCHAR(255) NOT NULL , `username_fm` TEXT NOT NULL , PRIMARY KEY (`id`), UNIQUE (`username`)) ENGINE = InnoDB;";
        con.query(sql, function (err, result, fields) {
            if(err) {
                console.log("Table could not be created! Error: " + err);
            } else {
                console.log("Successfully created table.");
            }
        });
    }
});

if (!fs.existsSync(__dirname + "\\serverSettings.json")) {
    var defaultServerSettings = {
        servers: {},
        commands: {
            countdown: {
                disabledChannels: {
                    
                }
            },
            vs: {
                disabledChannels: {
                    
                }
            },
            rym: {
                disabledChannels: {
                    
                }
            },
            fm: {
                disabledChannels: {
                    
                }
            },
            fmi: {
                disabledChannels: {
                    
                }
            },
            weekly: {
                disabledChannels: {
                    
                }
            },
            chart: {
                disabledChannels: {
                    
                }
            },
            help: {
                disabledChannels: {
                    
                }
            },
            choose: {
                disabledChannels: {
                    
                }
            }
        }
    };
    fs.writeFile(__dirname + "\\serverSettings.json", JSON.stringify(defaultServerSettings, null, 2), (err) => {
        if (err)
            console.log("Error creating server settings file: " + err);
    
        console.log("Created server settings file successfully.");
    }); 
} else {
    var serverSettings = JSON.parse(fs.readFileSync(__dirname + "\\serverSettings.json", 'utf8'));
    if(!("servers" in serverSettings)) {
        serverSettings.servers = {};
        fs.writeFile(__dirname + "\\serverSettings.json", JSON.stringify(serverSettings, null, 2), (err) => {
            if (err) {
                console.log("Error saving server settings file (updating with servers key): " + err);
            } else {
                console.log("saved server settings file successfully (updating with servers key):.");
            }
        }); 
    }
}
// logger.remove(logger.transports.Console);
// logger.add(logger.transports.Console, {
//     colorize: true
// });

// logger.level = 'debug';

var bot = new Discord.Client({
   token: auth.discordToken,
   autorun: true
});

bot.on('ready', function (evt) {
    console.log('Logged in as: ' + bot.username + ' - (' + bot.id + ')');
});

function sanitizeMarkdown(string) {
    string = String(string);
    console.log("replace " + string);
    var find = ['*', "_", "~", "`", "@", '_', '<', '>', '`'];
    var replace = ["\\*", "\\_", "\\~", "\\`", "@​", '\\_', '\\<', '\\>', '\\`'];
    return string.replaceArray(find, replace);
}

function lastFmErrorMessage(bot, userID, channelID, noTracks = false) {
    var message = "<@" + userID + ">" + ', please set your last.fm username using !fm set [username] - for example - !fm set deep_cuts';
    if(noTracks) {
        message = "<@" + userID + ">" + ', I cannot seem to access any tracks on your account. Make sure you have a scrobble before setting.';
    }
    if(bot.channels[channelID].guild_id === '328839831020896257') {
        bot.sendMessage({
            to: '340613001444982796',
            message: message
        });
    } else {
        bot.sendMessage({
            to: channelID,
            message: message
        });
    }
}

function trackNow(fmUsername, fmkey, cb) {
    var dataUrl = 'http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=' + fmUsername + '&api_key=' + fmkey + '&format=json&limit=1';
    request({
        url: dataUrl,
        json: true
    }, function (error, response, body) {
        if (!error && response.statusCode === 200 && body.recenttracks) {
            if(body['recenttracks']['track'].length > 0) {
                var data = {album: '', artist: '', track: '', images:[]};
                if(body['recenttracks']['track'][0]['album']['#text'].length > 0) {
                    data.album = body['recenttracks']['track'][0]['album']['#text'];
                }
                if(body['recenttracks']['track'][0]['name']) {
                    data.track = body['recenttracks']['track'][0]['name'];
                }
                if(body['recenttracks']['track'][0]['artist']['#text']) {
                    data.artist = body['recenttracks']['track'][0]['artist']['#text'];
                }
                if(body['recenttracks']['track'][0]['image'][0]['#text']) {
                    data.images = body['recenttracks']['track'][0]['image'];
                }
                cb(data, null);
            } else {
                cb(null, "No tracks found.");
            }
        } else {
            if(error)
                console.log(error);
            cb(null, error);
        }
    });
}

function sendLastFmFromData(data, channelID, fmUsername) {
    var userURL = "https://www.last.fm/user/" + fmUsername;
    if(data['album'].length > 0) {
        var trackString = '[' + sanitizeMarkdown(fmUsername) + '](' + userURL + ') | **' + sanitizeMarkdown(data['track']) + '** by **' + sanitizeMarkdown(data['artist']) + '**' +
                '\nfrom _**' + sanitizeMarkdown(data['album']) + '**_';
    } else {
        var trackString = '[' + sanitizeMarkdown(fmUsername) + '](' + userURL + ') | **' + sanitizeMarkdown(data['track']) + '** by **' + sanitizeMarkdown(data['artist']) + '**';
    }

    if(data.images.length > 0) {
        bot.sendMessage({
            to: channelID,
            embed: {
                color: 16711680,
                thumbnail: {
                    url: data['images'][0]['#text']
                },
                description: trackString
            }
        }, function (err, res) {
            if (err) console.log(err);
        });
    } else {
        bot.sendMessage({
            to: channelID,
            embed: {
                color: 16711680,
                description: trackString
            }
        }, function (err, res) {
            if (err) console.log(err);
        });
    }
}

function sendLastFm(fmUsername, fmkey, channelID, bot, userID) {
    var dataUrl = 'http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=' + fmUsername + '&api_key=' + fmkey + '&format=json&limit=1';
    request({
        url: dataUrl,
        json: true
    }, function (error, response, body) {
        if (!error && response.statusCode === 200 && body.recenttracks) {
            if(body['recenttracks']['track'].length > 0) {
                var userURL = "https://www.last.fm/user/" + fmUsername;
                if(body['recenttracks']['track'][0]['album']['#text'].length > 0) {
                    var trackString = '[' + sanitizeMarkdown(fmUsername) + '](' + userURL + ') | _**' + sanitizeMarkdown(body['recenttracks']['track'][0]['name']) + '**_ by **' + sanitizeMarkdown(body['recenttracks']['track'][0]['artist']['#text']) + '**' +
                    '\nfrom _**' + sanitizeMarkdown(body['recenttracks']['track'][0]['album']['#text']) + '**_';
                } else {
                    var trackString = '[' + sanitizeMarkdown(fmUsername) + '](' + userURL + ') | _**' + sanitizeMarkdown(body['recenttracks']['track'][0]['name']) + '**_ by **' + sanitizeMarkdown(body['recenttracks']['track'][0]['artist']['#text']) + '**';
                }
                
                bot.sendMessage({
                    to: channelID,
                    embed: {
                        color: 16711680,
                        thumbnail: {
                            url: body['recenttracks']['track'][0]['image'][0]['#text']
                        },
                        description: trackString
                    }
                });
            } else {
                lastFmErrorMessage(bot, userID, channelID, true);
            }
        } else {
            lastFmErrorMessage(bot, userID, channelID);
        }
    });
}

function sendTopArtists(fmUsername, fmkey, channelID, bot, userID) {
    var dataUrl = 'http://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=' + fmUsername + '&api_key=' + fmkey + '&format=json&limit=1';
    request({
        url: dataUrl,
        json: true
    }, function (error, response, body) {
        if (!error && response.statusCode === 200 && body.recenttracks) {

        }
    });
}

function setRym(username, channelID, bot, userID, con, user) {
    if(username.match("rateyourmusic.com")) {
        username = username.substring(username.indexOf('~')+1, username.length+1);
    }
    con.query("INSERT INTO `rym` (`id`, `discordId`, `username`) VALUES (NULL, '" + userID + "', '" + username + "') ON DUPLICATE KEY UPDATE `username` = VALUES(username);", function (err, result, fields) {
        if(!err) {
            bot.sendMessage({
                to: channelID,
                message: 'Your rateyourmusic.com username has been updated to `' + username + '`'
            });
        } else {
            console.log('Error setting rym for ' + user + '. Error:' + err);
        }
    });
}

function fileIsImage2(fileUrl) {
    if(!fs.existsSync(fileUrl)) return false;
    var options = {
        method: 'GET',
        url: fileUrl,
        encoding: null // keeps the body as buffer
    };

    request(options, function (err, response, body) {
        if(!err && response.statusCode == 200){
            var magigNumberInBody = body.toString('hex',0,4);
            
            if(magic.indexOf(magigNumberInBody) > -1) {
                return true;
            }
        } else {
            console.log("could not open file:");
            console.log(err);
        }
    });

    return false;
}

function fileIsImage(filename) {
    if(!fs.existsSync(filename)) return false;
    data = fs.readFileSync(filename);
    if(magic.indexOf(data.toString('hex',0,4)) > -1) {
        return true;
    }

    return false;
}

function setChart(chartlink, channelID, bot, userID, con, user, request) {
    var options = {
        method: 'GET',
        url: chartlink,
        encoding: null // keeps the body as buffer
    };

    request(options, function (err, response, body) {
        if(!err && response.statusCode == 200){
            var magigNumberInBody = body.toString('hex',0,4);
            if (magic.indexOf(magigNumberInBody) > -1) {
                con.query("INSERT INTO `chart` (`id`, `discordId`, `chartlink`) VALUES (NULL, '" + userID + "', '" + chartlink + "') ON DUPLICATE KEY UPDATE `chartlink` = VALUES(chartlink);", function (err, result, fields) {
                    if(!err) {
                        bot.sendMessage({
                            to: channelID,
                            message: "Your chart has been successfully submitted!"
                        });
                    } else {
                        console.log('Error setting chart for ' + user + '. Error:' + err);
                    }
                });
            } else {
                console.log(magigNumberInBody + ' not a valid header for an image!');
                console.log('link = '+ chartlink);
                bot.sendMessage({
                    to: channelID,
                    message: "<@" + userID + "> Your chart isn't valid! Links must point to either a jpg, png or gif."
                });
            }
        } else {
            bot.sendMessage({
                to: channelID,
                message: "<@" + userID + "> I can't seem to access the image you have provided, perhaps it has been devared / does not allow requests from bots."
            });
        }
    });
}

function setLastFm(fmUsername, fmkey, channelID, bot, userID, con, user, messageID) {
    var dataUrl = 'http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=' + fmUsername + '&api_key=' + fmkey + '&format=json&limit=1';
    request({
        url: dataUrl,
        json: true
    }, function (error, response, body) {
        if(body && body.recenttracks) {
            if(body !== null && body['recenttracks']['track'].length > 0) {
                con.query("INSERT INTO `last fm` (`id`, `username`, `username_fm`) VALUES (NULL, '" + userID + "', '" + fmUsername + "') ON DUPLICATE KEY UPDATE `username_fm` = VALUES(username_fm);", function (err, result, fields) {
                    if(!err) {
                        sendLastFm(fmUsername, fmkey, channelID, bot, userID, false, messageID);
                    } else {
                        console.log('fm set err 1 ' + err);
                    }
                });
            } else {
                lastFmErrorMessage(bot, userID, channelID, true);
            }
        } else {
            lastFmErrorMessage(bot, userID, channelID);
        }
    });
}

function wordsInString(wordsArray, str) {
    for(var i = 0; i < wordsArray.length; i++) {
        if(!str.toLowerCase().match(wordsArray[i].toLowerCase())) {
//            console.log('no match for ' + wordsArray[i] + ' in ' + str);
            return false;
        }
    }
    
    return true;
}

function searchStringInArray (str, strArray, argsArray) {
    var relevantIDs = [];
    for (var j=strArray.length - 1; j >= 0; j--) {
//        if (strArray[j]['title'].toLowerCase().match(str.toLowerCase())) relevantIDs.push(j);
        if(wordsInString(argsArray, strArray[j]['title']) || wordsInString(argsArray, strArray[j]['description'])) relevantIDs.push(j);
    }
    
    if(relevantIDs.length === 0) {
        return -1;
    } else if(relevantIDs.length === 1) {
        return relevantIDs[0];
    }
    
    return relevantIDs;
}

function arrayToString(array) {
    var str = "";
    for(var i = 0; i < array.length; i++)
        str += array[i];
    
    return str;
}

String.prototype.replaceArray = function(find, replace) {
    var replaceString = this;
    var regex; 
    for (var i = 0; i < find.length; i++) {
        if(find[i] == "*" || find[i] == "\\") {
            regex = new RegExp("\\" + find[i], "g");
        } else {
            regex = new RegExp(find[i], "g");
        }
        replaceString = replaceString.replace(regex, replace[i]);
  }
  return replaceString;
};

function strtok(src, delim){
  delim_escaped = new RegExp('[' + delim.replace(/[\[\]\(\)\*\+\?\.\\\^\$\|\#\-\{\}\/]/g, "\\$&") + ']', 'g');
  return src.replace(delim_escaped, delim[0]).split(delim[0]);
}

function genresString(snippet) {
    //find 'genres'
    var genresString = "";
    var index = snippet.indexOf("Genres: ");
    if(index === -1) {
        return;
    }
    for(var i = index + 8; i < snippet.length; i++) {
        if(snippet[i] === ".") {
            return genresString;
        } else {
            genresString += snippet[i];
        }
    }
    
    return genresString;
}

function getRndInteger(min, max) {
    return Math.floor(Math.random() * (max - min) ) + min;
}

function searchObjectArray(object, value) {
    for(var i in object) {
//        console.log("search " + object[i]);
        if(object[i] === value)
            return i;
    }
    
    return -1;
}

function searchCommands(commands, search) {
    for(var i in commands) {
        if(i === search)
            return i;
    }
    
    return -1;
}

function countO(object) {
    var n = 0;
    for(var i in object) {
        n++;
    }
    return n;
}

function unset(object, id) {
    var array = [];
    var n = 0;
    for(var i in object) {
        if(i !== id) {
            array[n] = object[i];
            n++;
        }
        
    }
    return array;
}

function unsetO(object, id) {
    var array = [];
    var n = 0;
    for(var i in object) {
        if(i !== id) {
            array[i] = object[i];
            n++;
        }
        
    }
    return array;
}

function sendMessageRetry(channelID, message) {
    bot.sendMessage({
        to: channelID,
        message: message
    }, function (err, res) {
        if(err && err.response && err.response['retry_after'] > 0) {
            setTimeout(function() {
                sendMessageRetry(channelID, message);
            }, err.response['retry_after']);
        } else if(err) {
            console.log('when sending ' + message);
            console.log(err);
        }
    });
}

function uploadFileRetry(channelID, filename, message, error_prefix) {
    bot.uploadFile({
        to: channelID,
        message: message,
        file: filename
    }, function(err, response) {
        if(err && err.response && err.response['retry_after'] > 0) {
            setTimeout(function() {
                uploadFileRetry(channelID, filename, message, error_prefix);
            }, err.response['retry_after']);
        } else if(err && err.response && err.response.code == 50013) {
            console.log("missing permissions");
            bot.sendMessage({to:channelID, message: "I seem to be missing permissions."}, (err) => {if(err) console.log(err)});
        } else if(err) {
            console.log('error uploading file (uploadFileRetry)' + error_prefix);
            console.log(err);
        } else {
            if(fs.existsSync(filename)) {
                fs.unlink(filename, function (err) {
                    if(err) console.log(err);
                });
            }
        }
    });
}

function countdown(channelID, num = 10) {
    var str = num;
    if(num == 0) {
        var str = "Go!";
    }

    bot.sendMessage({
        to: channelID,
        message: str
    }, function (err, res) {
        if(err && err.response && err.response['retry_after'] > 0) {
            setTimeout(function() {
                countdown(channelID, num);
            }, err.response['retry_after']);
        } else if(err) {
            console.log('when sending ' + str);
            console.log(err);
        } else if(num > 0) {
            setTimeout(function() {
                countdown(channelID, num-1);
            }, 1000);
        }
    });
}

bot.on('disconnect', function(errMsg, code) {
    console.log('disconnected\n');
    console.log(errMsg);
    console.log(code);
    bot.connect();
});

// var commandMessagePairs = [];

// bot.on('messageDevare', function(event) {
//     console.log('message update');
//     console.log(event);
//     if(event.d.id in commandMessagePairs) {
//         commandMessagePairs.splice(event.d.id, 1);
//     }
//     console.log(commandMessagePairs);
// });

var fmiTime = [];
var commandsWaiting = [];
bot.on('any', function(event) {
    var lastPage = false;
    var change = false;
    var numPP = 5;
//    var commandsWaiting = require("./commandsWaiting.json");
    if((event.t === "MESSAGE_REACTION_ADD" || event.t === "MESSAGE_REACTION_REMOVE") && commandsWaiting[event.d.message_id] && event.d.user_id !== bot.id) {
        if(event.d.emoji.name === "⬅" && commandsWaiting[event.d.message_id].page > 1) {
            commandsWaiting[event.d.message_id].page -= 1;
            change = true;
        } else if(event.d.emoji.name === "➡" && (commandsWaiting[event.d.message_id].page*numPP+numPP) <= countO(commandsWaiting[event.d.message_id].serverRymAccounts)) {
//            console.log(countO(commandsWaiting[event.d.message_id].serverRymAccounts) + " to " + (commandsWaiting[event.d.message_id].page*numPP+numPP));
            commandsWaiting[event.d.message_id].page += 1;
            change = true;
        }
        
        if((commandsWaiting[event.d.message_id].page*numPP+numPP) > countO(commandsWaiting[event.d.message_id].serverRymAccounts))
            lastPage = true;
        var message = "**Server RYM list**\n\n";  
        if(commandsWaiting[event.d.message_id].name === "rym" && change) {
            for(var i = (commandsWaiting[event.d.message_id].page*numPP-numPP); i < countO(commandsWaiting[event.d.message_id].serverRymAccounts) && i < (commandsWaiting[event.d.message_id].page*numPP); i++) {
                if(bot.servers[bot.channels[event.d.channel_id].guild_id].members[commandsWaiting[event.d.message_id].serverRymAccounts[i].discordId]) {
                    message += '[' + commandsWaiting[event.d.message_id].serverRymAccounts[i].username + '](https://rateyourmusic.com/~' + commandsWaiting[event.d.message_id].serverRymAccounts[i].username + ')\n' + bot.users[commandsWaiting[event.d.message_id].serverRymAccounts[i].discordId].username + "'s rateyourmusic.com account\n\n"; 
                }  
            }
            
            message += "Page " + commandsWaiting[event.d.message_id].page;
            if(lastPage)
                message += "    (last page)";
            bot.editMessage({
                channelID: event.d.channel_id,
                messageID: event.d.message_id,
                embed: {
                    color: 16711680,
                    description: message
                }
            });
        }
    }
});

bot.on('message', function (user, userID, channelID, message, evt) {
    var fmUsername = null;
    var username = null;
    if(bot.users[userID] === undefined) {
        bot.getAllUsers();
    }
    if(bot.users[userID] === undefined) {
        console.log("userID: " + userID + " undefined.");
        return;
    }
    if ((message.substring(0, 1) === '!' || message.substring(0, 1) === '.') && bot.users[userID] && !bot.users[userID].bot) {
        var args = message.substring(1).split(' ');
        var cmd = args[0].toLowerCase();
        var guild_id = bot.channels[channelID].guild_id;
       
        args = args.splice(1);
        var serverSettings = JSON.parse(fs.readFileSync(__dirname + "\\serverSettings.json", 'utf8'));
        if(!(guild_id in serverSettings.servers)) {
            serverSettings.servers[guild_id] = {
                adminRole: undefined
            }
        }
        if(bot.servers[guild_id].members[userID] === undefined) {
            console.log("member undefined for user:");
            console.log(bot.users[userID]);
            console.log("running get all users");
            bot.getAllUsers();
        }
        var member = bot.servers[guild_id].members[userID];
        if(member === undefined) {
            var hasAdmin = false;
            console.log('hasAdmin produced undefined result');
            console.log("guild_id = " + guild_id);
            console.log("userID = " + userID);
            console.log('guild name = ' + bot.servers[guild_id].name);
            console.log(bot.users[userID]);
        } else {
            var hasAdmin = member.roles.indexOf(serverSettings.servers[guild_id].adminRole) > -1;
        }
        if(userID == bot.servers[bot.channels[channelID].guild_id].owner_id) {
            var hasAdmin = true;
            // console.log(bot.users[userID]);
            console.log('user hasAdmin, user owner userID: ' + userID);
        }
        var authedUser = authedUsers.indexOf(userID) > -1;

        //debuging mode
        if(!authedUser)
            return;

        
        if(serverSettings.commands === undefined || serverSettings.servers === undefined) {
            console.log("ERROR w/ serversettings");
            console.log(serverSettings);
            return;
        }
        
        switch(cmd) {
            case 'servers':
                if(authedUser) {
                    var totalUsers = 0;
                    var totalServers = 0;
                    var msg = "";
                    // Object.values(bot.servers).forEach(function (value) {
                    for(var key in bot.servers) {
                        var value = bot.servers[key];
                        guild_id = value.id;
                        msg += value.name + "   -   " + value.member_count + " users\n";
                        if(bot.users[value.owner_id] !== undefined) {
                            msg += "Owner: " + bot.users[value.owner_id].username + "#" + bot.users[value.owner_id].discriminator + "\n";
                        }
                        if(serverSettings.servers[guild_id] === undefined) {
                            serverSettings.servers[guild_id] = {
                                adminRole: undefined
                            };
                        }
                        if(serverSettings.servers[guild_id].adminRole !== undefined) {
                            msg += "Admin Role: " + bot.servers[guild_id].roles[serverSettings.servers[guild_id].adminRole].name + "\n";
                        } else {
                            msg += "Admin Role undefined\n";
                        }
                        sendMessageRetry(channelID, msg);
                        msg = "";
                        totalUsers += value.member_count;
                        totalServers++;
                    };
                    sendMessageRetry(channelID, totalUsers + " total users accross " + totalServers + " servers");
                }
            break;
            case 'adminrole':
                if(authedUser) {
                    var input = args.join(' ');
                    var foundRole = Object.values(bot.servers[guild_id].roles).find(c => c.name === input);
                    if(foundRole === undefined) {
                        bot.sendMessage({to:channelID, message: "No role could be found for the name `" + sanitizeMarkdown(input) + "` on the server `" + bot.servers[guild_id].name + "`"}, function (err, res) {if(err) console.log(err)});
                    } else {
                        serverSettings.servers[guild_id].adminRole = foundRole.id;
                        bot.sendMessage({to:channelID, message: "Set the admin role on `" + bot.servers[guild_id].name + "` to `" + foundRole.name + "`"}, function (err, res) {if(err) console.log(err)});
                    }
                    bot.sendMessage({to:channelID, message:"The current role is `" + bot.servers[guild_id].roles[serverSettings.servers[guild_id].adminRole].name + '`'}, function (err, res) {if (err) console.log(err)});
                    fs.writeFile(__dirname + "\\serverSettings.json", JSON.stringify(serverSettings, null, 2), (err) => {
                        if (err)
                            console.log("Error saving server settings file: ");
                            console.log(err);
                    }); 
                }
            break;
            case 'authedusers':
                if(authedUser) {
                    var msg = "Authorised Global Users: ";
                    authedUsers.forEach(function (value, index) {
                        var u = bot.users[value];
                        
                        if(index > 0)
                            msg += ", ";
                        if(u === undefined) {
                            msg += value; 
                            return;
                        }
                        msg += u.username + "#" + u.discriminator;
                    });
                    bot.sendMessage({to:channelID, message: msg}, function (err, res) {if(err) console.log(err)});
                }
            break;
            case 'pick':
                if(guild_id == "328839831020896257" || guild_id == "372539772960243723") {
                    var listeningLounge = require('./listeningLounge.json');
                    var userPicked = listeningLounge.userPicks[userID];
                    if(userPicked === undefined) {
                        listeningLounge.userPicks[userID] = [];
                    }
                    var albumOptions = [];
                    listeningLounge.albums.forEach(function(value) {
                        if(listeningLounge.userPicks[userID].indexOf(value) === -1)
                            albumOptions.push(value);
                    });
                    if(listeningLounge.userPicks[userID] === undefined) {
                        listeningLounge.userPicks[userID] = [];
                    }
                    if(albumOptions.length === 0) {
                        bot.sendMessage({to:channelID, message:"Looks as if you have gone through all the listening lounge albums for this week, congratulations!"}, (err) => {if(err) console.log(err)});
                    } else {
                        var pickedNum = getRndInteger(0, albumOptions.length);
                        var pickedAlbum = albumOptions[pickedNum];
                        if(pickedAlbum != null)
                            listeningLounge.userPicks[userID].push(pickedAlbum);
                        var edgeCase = "";
                        if(listeningLounge.userPicks[userID].length == listeningLounge.albums.length) {
                            edgeCase += "This is your last album on the listening lounge list! Thanks for participating.";
                        }
                        bot.sendMessage({to:channelID, message: pickedAlbum + " - you have listened to " + (listeningLounge.userPicks[userID].length) + " albums of " + listeningLounge.albums.length + ". " + edgeCase}, (err) => {if(err) console.log(err)});
                    }
                    fs.writeFile("listeningLounge.json", JSON.stringify(listeningLounge, null, 2), (err) => {
                        if (err) {
                            console.log("Error saving listening lounge file"); 
                            console.log(err);
                        }
                    }); 
                }
            break;
            case 'llupdate':
                if(authedUser) {
                    var album_url = args[0];
                    if(album_url.length == 0) {
                        bot.sendMessage({to:channelID, message: "Doesn't look like you've provided me with anything I can use."}, function (err, res) {if(err) console.log(err)});
                    } else {
                        // make request to https://api.imgur.com/3/album/uT6vWr5/images?token=8205fa8f4b22acdfae15c392ff1cc1e945df5bba&client_id=7796ad498a90c87
                        if(auth.imgur.client_id.length !== 0 && auth.imgur.token.length !== 0) {
                            request({
                                url: 'https://api.imgur.com/3/album/' + album_url.match(/imgur.com\/a\/(.{7})/)[1] + "/images?token=" + auth.imgur.token + "&client_id=" + auth.imgur.client_id,
                                json: true
                            }, function (error, response, body) {
                                if (!error && response.statusCode === 200 && body.data !== undefined) {
                                    var ll = {
                                        albums: [],
                                        dateUpdated: Date.now(),
                                        userPicks: []
                                    };
                                    body.data.forEach(function (value) {
                                        console.log(value.link + " added");
                                        ll.albums.push(value.link);
                                    });
                                    console.log(ll.albums);
                                    console.log(ll);
                                    fs.writeFile("listeningLounge.json", JSON.stringify(ll, null, 2), (err) => {
                                        if (err) {
                                            console.log("Error saving listening lounge file"); 
                                            console.log(err);
                                        } else {
                                            bot.sendMessage({to:channelID, message: "Listening Lounge updated successfully."}, (err, res) => {if(err) console.log(err)});
                                        }
                                    }); 
                                } else {
                                    bot.sendMessage({to:channelID, message: "Unfortunately I had trouble with this album."}, (err, res) => {if(err) console.log(err)});
                                }
                            });
                        } else {
                            bot.sendMessage({to:channelID, message: "Unfortunately I do not have the required imgur api details to access this album."}, (err, res) => {if(err) console.log(err)});
                        }
                    }
                }
            break;
            case 'disable':
                if(authedUser || hasAdmin) {
                    if(args[0] === "all") {
                        for(var i in serverSettings.commands) {
                            var chN = 0;
                            for(var cID in bot.channels) {
                                if(bot.channels[cID].type === 0) {
                                    var disabledChannels = serverSettings['commands'][i]['disabledChannels'];
                                    var numDisabled = countO(disabledChannels);
                                    if(bot.channels[cID].guild_id === guild_id && (numDisabled === 0  || searchObjectArray(disabledChannels, cID) === -1)) {
                                        if(numDisabled === 0) {
                                            serverSettings['commands'][i]['disabledChannels'][0] = cID;
                                        } else {
                                            serverSettings['commands'][i]['disabledChannels'][numDisabled] = cID;
                                        }
                                    }
                                }
                            }
                        }
                        fs.writeFile(__dirname + "\\serverSettings.json", JSON.stringify(serverSettings, null, 2), (err) => {
                            if (err)
                                console.log("Error saving server settings file: " + err);
                            else
                                bot.sendMessage({
                                   to:channelID,
                                   message: "Disabled all commands on this server. You can enable them one by one with `!enable [command]` or enable them all with `!enable all`"
                                });
                        }); 
                    } else if(serverSettings['commands'][args[0]]){
                        if(args[1] !== "all") {
                            var disabledChannels = serverSettings['commands'][args[0]]['disabledChannels'];
                            var numDisabled = countO(disabledChannels);
                            var cIDindex = searchObjectArray(disabledChannels, channelID);
                            if(numDisabled === 0 || cIDindex === -1) {
                                serverSettings['commands'][args[0]]['disabledChannels'][numDisabled] = channelID;
                                fs.writeFile(__dirname + "\\serverSettings.json", JSON.stringify(serverSettings, null, 2), (err) => {
                                    if (err)
                                        console.log("Error saving server settings file: " + err);
                                    else
                                        bot.sendMessage({
                                           to:channelID,
                                           message: "Disabled " + args[0] + " in " + bot.channels[channelID].name
                                        });
                                }); 

                            }
                        } else if(args[1] === "all") {
                            for(var cID in bot.channels) {
                                if(bot.channels[cID].type === 0) {
                                    var disabledChannels = serverSettings['commands'][args[0]]['disabledChannels'];
                                    var numDisabled = countO(disabledChannels);
                                    var cIDindex = searchObjectArray(disabledChannels, cID);
                                    if(bot.channels[cID].guild_id === guild_id && cIDindex === -1) {
                                        serverSettings['commands'][args[0]]['disabledChannels'][numDisabled] = cID;
                                    }
                                }
                            }
                            fs.writeFile(__dirname + "\\serverSettings.json", JSON.stringify(serverSettings, null, 2), (err) => {
                                if (err)
                                    console.log("Error saving server settings file: " + err);
                                else
                                    bot.sendMessage({
                                       to:channelID,
                                       message: "Disabled " + args[0] + " in all channels"
                                    });
                            }); 
                        } else {
                            console.log("unkown option disable " + JSON.stringify(args));
                        }
                    }
                }
            break;
            case 'enable':
                if(authedUser || hasAdmin) {
                    if(args[0] === "all") {
                        for(var i in serverSettings.commands) {
                            var chN = 0;
                            for(var cID in bot.channels) {
                                if(bot.channels[cID].type === 0) {
                                    var disabledChannels = serverSettings['commands'][i]['disabledChannels'];
                                    var numDisabled = countO(disabledChannels);
                                    var cIDindex = searchObjectArray(disabledChannels, cID);
                                    if(numDisabled > 0 && bot.channels[cID].guild_id === guild_id && cIDindex !== -1) {
                                        serverSettings['commands'][i]['disabledChannels'] = unset(disabledChannels, cIDindex);
                                    }
                                }
                            }
                        }
                        fs.writeFile(__dirname + "\\serverSettings.json", JSON.stringify(serverSettings, null, 2), (err) => {
                            if (err)
                                console.log("Error saving server settings file: " + err);
                            else
                                bot.sendMessage({
                                   to:channelID,
                                   message: "Enabled all commands on this server. You can disable them one by one with `!disable [command]` or disable them all with `!disable all`"
                                });
                        }); 
                    } else if(serverSettings['commands'][args[0]]){
                        if(args[1] !== "all") {
                            var disabledChannels = serverSettings['commands'][args[0]]['disabledChannels'];
                            var numDisabled = countO(disabledChannels);
                            var cIDindex = searchObjectArray(disabledChannels, channelID);
                            if(numDisabled > 0 && cIDindex !== -1) {
                                serverSettings['commands'][args[0]]['disabledChannels'] = unset(disabledChannels, cIDindex);
                                fs.writeFile(__dirname + "\\serverSettings.json", JSON.stringify(serverSettings, null, 2), (err) => {
                                    if (err)
                                        console.log("Error saving server settings file: " + err);
                                    else
                                        bot.sendMessage({
                                           to:channelID,
                                           message: "Enabled " + args[0] + " in " + bot.channels[channelID].name
                                        });
                                }); 

                            } else {
                                console.log(numDisabled + " - " + cIDindex);
                                console.log(cID + " + " + JSON.stringify(disabledChannels));
                            }
                        } else if(args[1] === "all") {
                            for(var cID in bot.channels) {
                                if(bot.channels[cID].type === 0) {
                                    var disabledChannels = serverSettings['commands'][args[0]]['disabledChannels'];
                                    var numDisabled = countO(disabledChannels);
                                    var cIDindex = searchObjectArray(disabledChannels, cID);
                                    if(numDisabled > 0 && bot.channels[cID].guild_id === guild_id && cIDindex !== -1) {
                                        serverSettings['commands'][args[0]]['disabledChannels'] = unset(disabledChannels, cIDindex);
                                    }
                                }
                            }
                            fs.writeFile(__dirname + "\\serverSettings.json", JSON.stringify(serverSettings, null, 2), (err) => {
                                if (err)
                                    console.log("Error saving server settings file: " + err);
                                else
                                    bot.sendMessage({
                                       to:channelID,
                                       message: "Enabled " + args[0] + " in all channels"
                                    });
                            }); 
                        }
                    } else {
                        console.log("enable unknown option");
                        console.log(JSON.stringify(args));
                    }
                }
            break;
            case 'fm':
                if(searchObjectArray(serverSettings['commands']['fm']['disabledChannels'], channelID) === -1) {
                    bot.simulateTyping(channelID);
                    if(args[0] === "set") {
                        setLastFm(args[1], fmkey, channelID, bot, userID, con, user);
                    } else if(fmUsername === null) {
                        var sql = 'SELECT * FROM `last fm` WHERE `username` = ' + mysql.escape(userID);
                        con.query(sql, function (err, result, fields) {
                            if(err)
                                console.log(err);
                            if (result == undefined || !result.length) {
                                lastFmErrorMessage(bot, userID, channelID);
                            } else if(result[0].username === userID) {
                                if(args[0] === "top" && args[1] === "artists") {
                                    sendTopArtists(result[0].username_fm, fmkey, channelID, bot, userID);
                                } else {
                                    sendLastFm(result[0].username_fm, fmkey, channelID, bot, userID, false);
                                }
                            } else {
                                lastFmErrorMessage(bot, userID, channelID);
                            }
                        });
                    }
                }
            break;
            case 'fmi':
                if(searchObjectArray(serverSettings['commands']['fmi']['disabledChannels'], channelID) === -1) {
                    bot.simulateTyping(channelID);
                    var waitSecs = 900;
                    var inGenreChannels = bot.channels[channelID].parent_id == "356410492463611904" || bot.channels[channelID].guild_id != "328839831020896257";
                    if(fmiTime[userID] != undefined && (Date.now() - fmiTime[userID])/1000 < waitSecs && !inGenreChannels && bot.channels[channelID].guild_id === "328839831020896257") {
                        var secs = (Date.now() - fmiTime[userID])/1000;
                        secs = waitSecs - secs;
                        var mins = Math.floor(secs / 60);
                        var message = "<@" + userID + "> Slow down! Wait " + mins + " minutes. Engage in discussion for a bit. Remember: you still have unlimited use in the genre channels!"
                        if(bot.channels[channelID].guild_id === '328839831020896257') {
                            channelID = "340613001444982796";
                        }
                        if(secs < 60) {
                            message = "<@" + userID + "> Slow down! Wait " + Math.round(secs) + " seconds. Engage in discussion for a bit. Remember: you still have unlimited use in the genre channels!"
                        } else if(mins == 1) {
                            message = "<@" + userID + "> Slow down! Wait " + mins + " minute. Engage in discussion for a bit. Remember: you still have unlimited use in the genre channels!"
                        }
                        // bot.sendMessage({
                        //     to:channelID,
                        //     message: message
                        // }, function(err, res) {
                        //     if(err) console.log(err);
                        // });
                        sendMessageRetry(channelID, message);
                    } else if(fmUsername === null) {
                        var sql = 'SELECT * FROM `last fm` WHERE `username` = ' + mysql.escape(userID);
                        con.query(sql, function (err, result, fields) {
                            if(err)
                                console.log(err);
                            if (!result.length) {
                                lastFmErrorMessage(bot, userID, channelID);
                            } else if(result[0].username === userID) {
                                trackNow(result[0].username_fm, fmkey, function (data, error) {
                                    if(data.images.length === 0) {
                                        sendLastFmFromData(data, channelID, result[0].username_fm);
                                    } else if(data.images && data['images'][2]['#text'] !== "") {
                                        if(!inGenreChannels && bot.channels[channelID].guild_id === "328839831020896257") {
                                            fmiTime[userID] = Date.now();
                                        }
                                        var headers = {
                                            'User-Agent': 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11',
                                        };
                                        var filename = 'weekly/' + userID + "-fmi.png";
                                        var options = {
                                            hostname: 'tagsnobs.com',
                                            path: '/fmi/?userid=' + userID + '&avatar=' + encodeURIComponent(bot.users[userID].avatar) + '&track=' + encodeURIComponent(data['track']) + '&artist=' + encodeURIComponent(data['artist']) + '&album=' + encodeURIComponent(data['album']) + '&image=' + encodeURIComponent(data['images'][2]['#text']),
                                            method: 'GET',
                                            headers: headers
                                        };
                                        var file = fs.createWriteStream(filename);
                                        http.get(options, function(response) {
                                            var stream = response.pipe(file);
                                            stream.on('finish', function () {
                                                if(fs.existsSync(filename) && fileIsImage(filename)) {
                                                    uploadFileRetry(channelID, filename, '', '(generating fmi)');
                                                } else {
                                                    bot.sendMessage({
                                                        to: channelID,
                                                        message: "I'm sorry. Something happened when fetching your fmi."
                                                    });
                                                    console.log(fs.readFileSync(filename));
                                                    console.log(response);
                                                }
                                            });
                                        }, function (res) {
                                            console.log(res);
                                        });
                                    } else {
                                        sendLastFmFromData(data, channelID, result[0].username_fm);
                                    }
                                });
                            } else if(result[0].username === userID) {
                                sendLastFm(result[0].username_fm, fmkey, channelID, bot, userID, false);
                            } else {
                                lastFmErrorMessage(bot, userID, channelID);
                            }
                        });
                    }
                }
            break;
            case 'rym':
                if(searchObjectArray(serverSettings['commands']['rym']['disabledChannels'], channelID) === -1) {
                    bot.simulateTyping(channelID);
                    if(args[0] === "list") {
                        var sql = 'SELECT * FROM `rym`';
                        con.query(sql, function (err, result, fields) {
                            if(err)
                                console.log(err);
                            if(!result.length) {
                                console.log("rym list failed " + JSON.stringify(result));
                            } else {
                                var message = "**Server RYM list**\n\n";
                                var serverRymAccounts = [];
                                var numInList = 0;
                                for(var i in result) {
                                    if(bot.servers[bot.channels[channelID].guild_id].members[result[i].discordId]) {
                                        numInList++;
                                        serverRymAccounts.push({username:result[i].username, discordId: result[i].discordId});
                                        if(numInList <= 5)
                                            message += '[' + result[i].username + '](https://rateyourmusic.com/~' + result[i].username + ')\n' + bot.users[result[i].discordId].username + "'s rateyourmusic.com account\n\n"; 
                                    }  
                                }
                                maxPage = Math.round(serverRymAccounts.length/5);
                                if(maxPage == 0) message += "Page 1 (only)";
                                if(maxPage > 0) message += "Page 1 - " + serverRymAccounts.length + " accounts";
                                bot.simulateTyping(channelID);
                                bot.sendMessage({
                                    to: channelID,
                                    embed: {
                                        color: 16711680,
                                        description: message
                                    }
                                }, function(err, res) {
                                    if(err) {
                                        console.log(JSON.stringify(err));
                                    } else if (maxPage > 1){
                                        console.log(maxPage + " pages");
                                        bot.addReaction({
                                            channelID: channelID,
                                            messageID: res.id,
                                            reaction: "⬅"
                                        }, function (err, res2) {
                                            if(err) {
                                                console.log(err);
                                            } else {
                                                setTimeout(function(){
                                                    bot.addReaction({
                                                        channelID: channelID,
                                                        messageID: res.id,
                                                        reaction: "➡"
                                                    }, function (err, res3) {
                                                        if(err) {
                                                            console.log(err);
                                                        } else {
                                                            maxPage = Math.round(serverRymAccounts.length/5);
                                                            var ts = Math.round((new Date()).getTime() / 1000);
                                                            commandsWaiting[res.id] = {page:1, maxPage: maxPage, serverRymAccounts: serverRymAccounts, name: 'rym', id: res.id, ts: ts};
                                                            for(var i in commandsWaiting) {
                                                                if(Math.round((new Date()).getTime() / 1000) - commandsWaiting[i].ts > 10) {
                                                                    commandsWaiting = unsetO(commandsWaiting, i);
                                                                    console.log("unset " + i);
                                                                }
                                                            }
                                                            setTimeout(function(){
                                                                //devare reactions
                                                                bot.removeAllReactions({
                                                                        channelID: channelID,
                                                                        messageID: res.id
                                                                }, function(res) {
                                                                    console.log(res);
                                                                });
                                                                commandsWaiting = unsetO(commandsWaiting, res.id);
                                                                console.log("closed rym list");
                                                            }, 60000);
                                                        }
                                                    });
                                                }, 550);
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    } else if(args[0] === "set") {
                        setRym(args[1], channelID, bot, userID, con, user);
                    } else {
                        if(countO(evt.d.mentions) > 0) {
                            userID = evt.d.mentions[0].id;
                            user = evt.d.mentions[0].username;
                        }
                        var sql = 'SELECT * FROM `rym` WHERE `discordId` = ' + mysql.escape(userID);
                        con.query(sql, function (err, result, fields) {
                            if(err)
                                console.log(err);
                            if (!result.length) {
                                if(countO(evt.d.mentions) > 0) {
                                    bot.sendMessage({
                                        to: channelID,
                                        message: user + " doesn't have their rym set."
                                    });
                                } else {
                                    bot.sendMessage({
                                        to: channelID,
                                        message: "<@" + userID + "> Your rym hasn't been set. Set it with `!rym set [username]`"
                                    });
                                }
                            } else if(result[0].discordId === userID) {
                                bot.sendMessage({
                                    to: channelID,
                                    embed: {
                                        color: 16711680,
                                        title: result[0].username,
                                        url: 'https://rateyourmusic.com/~' + result[0].username,
                                        description: user + "'s rateyourmusic.com account"
                                    }
                                }, function (err) {
                                    if(err) {
                                        console.log(err);
                                    }
                                });
                            } else {
                                bot.sendMessage({
                                    to: channelID,
                                    message: "<@" + userID + "> Your rym username hasn't been set. Set it with `!rym set [username]`"
                                });
                            }
                        });
                    }
                }    
            break;
            case 'joindate':
                if(searchObjectArray(serverSettings['commands']['joindate']['disabledChannels'], channelID) === -1) {
                    bot.simulateTyping(channelID);
                    if(countO(evt.d.mentions) > 0) {
                        userID = evt.d.mentions[0].id;
                        user = evt.d.mentions[0].username;
                    }
                    var date = new Date(bot.servers[bot.channels[channelID].guild_id].members[userID].joined_at);
                    var mins = date.getMinutes();
                    if(mins < 10) {
                        mins = "0" + mins;
                    }
                    bot.sendMessage({
                        to: channelID,
                        message: user + " joined on " + date.getDate() + "/" + (date.getMonth()+1) + "/" + date.getFullYear() + " at " + date.getHours() + ":" + mins
                    });
                }
            break;
            case 'chart':
                if(searchObjectArray(serverSettings['commands']['chart']['disabledChannels'], channelID) === -1) {
                    bot.simulateTyping(channelID);
                    if(args[0] === "set") {
                        chartSet = false;
                        var string = args[1];
                        if(string != undefined && string.length > 0) {
                            if(string.match(/imgur.com\/(.{7})/) && !string.match(/imgur.com\/a\/(.{7})/)) {
                                url = 'https://i.imgur.com/' + string.match(/imgur.com\/(.{7})/)[1] + '.jpg';
                            } else {
                                url = args[1];
                            }
                            //check if imgur api works ADD
                            if(string.match(/imgur.com\/a\/(.{7})/)) {
                                if(auth.imgur.client_id.length == 0 || auth.imgur.token.length == 0) {
                                    console.log("imgur settings not provided in auth.js");
                                } else {
                                    request({
                                        url: 'https://api.imgur.com/3/album/' + string.match(/imgur.com\/a\/(.{7})/)[1] + "/images?token=" + auth.imgur.token + "&client_id=" + auth.imgur.client_id,
                                        json: true
                                    }, function (error, response, body) {
                                        if (!error && response.statusCode === 200 && body.data !== undefined) {
                                            url = body.data[0].link;
                                            setChart(url, channelID, bot, userID, con, user, request);
                                            chartSet = true;
                                        } else {
                                            console.log(err);
                                            console.log(body);
                                            bot.sendMessage({to:channelID, message: "I'm sorry but I had trouble accessing the imgur album you have provided."}, (err) => {if(err) console.log(err)});
                                        }
                                    });
                                }
                            } else if(url.length > 0 && string.indexOf('discord') === -1 && !chartSet) {
                                chartSet = true;
                                setChart(url, channelID, bot, userID, con, user, request);
                            }
                        } else if(string == undefined) {
                            string = "";
                        }
                        if(chartSet) {
                            // 
                        } else if(auth.imgur.client_id.length == 0 || auth.imgur.token.length == 0) {
                            console.log("imgur settings not provided in auth.js");
                        } else if(evt.d.attachments.length > 0 || string.indexOf('discord') > -1) {
                            setTimeout(function() {
                                if(string.indexOf('discord') > -1 && string.length > 0) {
                                    var imgur_img_url = string;
                                } else {
                                    var imgur_img_url = evt.d.attachments[0].url;
                                }
                                var headers = {
                                    'Authorization': 'Client-ID ' + auth.imgur.client_id,
                                    'Authorization': 'Bearer ' + auth.imgur.token,
                                    'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW'
                                };
                                var options = {
                                    hostname: 'api.imgur.com',
                                    path: '/3/image?image=' + encodeURIComponent(imgur_img_url) + "&title=" + encodeURIComponent(evt.d.author.username + '#' + evt.d.author.discriminator + "'s chart"),
                                    method: 'POST',
                                    headers: headers
                                };
                                https.get(options, function(response) {
                                    response.setEncoding('utf8');
                                    response.on('data', function (body) {
                                        var body_data = JSON.parse(body);
                                        if(body_data.status == 200 && body_data.data.link.length > 0) {
                                            bot.sendMessage({
                                                to: channelID,
                                                message: "Your chart has been uploaded to imgur as <" + body_data.data.link + ">"
                                            });
                                            setChart(body_data.data.link, channelID, bot, userID, con, user, request);
                                        } else {
                                            console.log(body_data.status)
                                            console.log('an error has occured when uploading to imgur');
                                            console.log(body_data)
                                            console.log(evt.d.attachments[0]);
                                            sendMessageRetry(channelID, "I'm sorry but I was unable to upload this image to imgur. Perhas it is too large.");
                                        }
                                    });
                                }, function (err) {
                                    if(err) console.log(err);
                                });
                            }, 1000);
                        }
                    } else {
                        if(countO(evt.d.mentions) > 0) {
                            userID = evt.d.mentions[0].id;
                            user = evt.d.mentions[0].username;
                            console.log(message);
                            if(args[0].substring(0, 2) === '<@')
                                console.log('matched');
                        }
                        var sql = 'SELECT * FROM `chart` WHERE `discordId` = ' + mysql.escape(userID);
                        con.query(sql, function (err, result, fields) {
                            if(err) 
                                console.log(err);
                            if (!result.length) {
                                if(countO(evt.d.mentions) > 0) {
                                    bot.sendMessage({
                                        to: channelID,
                                        message: user + " doesn't have their chart set."
                                    });
                                } else {
                                    bot.sendMessage({
                                        to: channelID,
                                        message: "<@" + userID + "> Your chart hasn't been set. Set it with `!chart set [imagelink]`"
                                    });
                                }
                            } else if(result[0].discordId === userID) {
                                bot.sendMessage({
                                    to: channelID,
                                    embed: {
                                        color: 16711680,
                                        title: user + "'s chart",
                                        image: {
                                            url: result[0].chartlink
                                        }
                                    }
                                });
                            } else {
                                bot.sendMessage({
                                    to: channelID,
                                    message: "<@" + userID + "> Your chart hasn't been set. Set it with `!chart set [imagelink]`"
                                });
                            }
                        });
                    }
                }    
            break;
            case 'weekly':
                if(searchObjectArray(serverSettings['commands']['weekly']['disabledChannels'], channelID) === -1) {
                    bot.simulateTyping(channelID);
                    if(args[0] == null || args[0] == "3x3" || args[0] == "2x6" || args[0] == "4x4" || args[0] == "5x5") {
                        if(args[0] == '2x6') {
                            args[0] = '2x6';
                        } else if(args[0] == null) {
                            args[0] = '3x3';
                        }
                        var sql = 'SELECT * FROM `last fm` WHERE `username` = ' + mysql.escape(userID);
                        con.query(sql, function (err, result, fields) {
                            if(err)
                                console.log('error sending fm data for ' + user + ' ' + err);
                            if (result == undefined || !result.length) {
                                lastFmErrorMessage(bot, userID, channelID);
                            } else if(result[0].username === userID) {
                                var filename = 'weekly/' + userID + "- " + args[0] + "-weekly.jpg";
                                var link = 'http://www.tapmusic.net/collage.php?user=' + result[0].username_fm + '&type=7day&size=' + args[0] + '&caption=true';
                                var file = fs.createWriteStream(filename);
                                http.get(link, function(response) {
                                    var stream = response.pipe(file);
                                    stream.on('finish', function () {
                                        console.log(filename);
                                        if(fs.existsSync(filename) && fileIsImage(filename)) {
                                            uploadFileRetry(channelID, filename, "<@" + userID + ">", '(generating weekly - ' + args[0] + ')');
                                        } else {
                                            bot.sendMessage({
                                                to: channelID,
                                                message: "I'm sorry. Something has happened when trying to fetch a chart for you, perhaps you have not listened to enough this week."
                                            }, (err) => {if(err) console.log(err)});
                                        }
                                    });

                                });
                            } else {
                                lastFmErrorMessage(bot, userID, channelID);
                            }
                        });
                    } else {
                        bot.sendMessage({
                            to: channelID,
                            message: args[0] + ' is not a valid size! Please try one of the following - 2x6, 3x3, 4x4, 5x5.'
                        }, (err) => {if(err) console.log(err)});
                    }
                }    
            break;
            case 'choose':
                if(searchObjectArray(serverSettings['commands']['choose']['disabledChannels'], channelID) === -1) {
                    bot.simulateTyping(channelID);
                    var optionsString = "";
                    for(var i in args) {
                        optionsString += " " + args[i];
                    }
                    optionsString = optionsString.substr(1);
                    if(optionsString.indexOf('|') === -1) {
                        bot.sendMessage({
                            to: channelID,
                            message: "<@" + userID + "> incorrectly formatted - choose command options must be separated by | - for example `!choose a | b | c`"
                        });
                    } else {
                        var options = optionsString.split('|');
                        var option = getRndInteger(0, options.length);
                        bot.sendMessage({
                            to: channelID,
                            message: bot.username + ' selects `' + sanitizeMarkdown(options[option]) + '`'
                        });
                    }
                }    
            break;
            case 'vs':
                if(searchObjectArray(serverSettings['commands']['vs']['disabledChannels'], channelID) === -1) {
                    //AIzaSyDDe1TNvVFdQd-6wzigSB6pmaGvHCEOuiQ
                    bot.simulateTyping(channelID);
                    var search = "";
                    for(var i in args) {
                        search += " " + args[i];
                    }
                    search = search.substr(1);
                    if(search.length > 0) {
                        request({
                            url: "https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=UCRYhCg0DHloE9gn-PAiAYNg&key=AIzaSyDDe1TNvVFdQd-6wzigSB6pmaGvHCEOuiQ&q=" + search,
                            json: true
                        }, function (error, response, body) {
                            if (!error && response.statusCode === 200) {
                                results_num = 0;
                                if(body.pageInfo.totalResults > 0) {
                                    for(var i = 0; i < body.items.length; i++) {
                                        if(body.items[i].id.videoId && wordsInString(args, body.items[i].snippet.title)) {
                                            results_num++;
                                            bot.sendMessage({
                                                to: channelID,
                                                embed: {
                                                    thumbnail: {
                                                        url: "https://i.ytimg.com/vi/" + body.items[i].id.videoId + "/mqdefault.jpg"
                                                    },
                                                    color: 16711680,
                                                    title: sanitizeMarkdown(body.items[i].snippet.title),
                                                    url: "https://www.youtube.com/watch?v=" + body.items[i].id.videoId,
                                                    description: sanitizeMarkdown(body.items[i].snippet.description)
                                                }
                                            });
                                        }
                                    }
                                    if(results_num == 0) {
                                      bot.sendMessage({
                                          to: channelID,
                                          message: 'No results.'
                                      });
                                    }
                                } else {
                                    bot.sendMessage({
                                        to: channelID,
                                        message: 'No results.'
                                    });
                                }    
                            }
                        });
                    } else {
                        bot.sendMessage({
                            to: channelID,
                            message: 'No search query entered.'
                        });
                    }
                }
            break;
            case 'countdown':
                if(searchObjectArray(serverSettings['commands']['countdown']['disabledChannels'], channelID) === -1) {
                    countdown(channelID, 10);
                }
            break;
            case 'help':
                if(searchObjectArray(serverSettings['commands']['help']['disabledChannels'], channelID) === -1) {
                    bot.simulateTyping(channelID);
                    bot.sendMessage({
                        to: channelID,
                        embed: {
                            color: 16711680,
                            fields: [{
                                name: "fm",
                                value: "Show latest played track from last.fm\n     **fm set [username]**\n          Link your last.fm account username."
                              },
                              {
                                name: "fmi",
                                value: "Show latest played track from last.fm in an image format (if there is not image on last fm the normal fm format will be produced)."
                              },
                              {
                                name: "vs",
                                value: "Search Oliver's YouTube channel. \n    **vs radiohead**\n          An example search query."
                              },
                              {
                                name: "countdown",
                                value: "Countdown an LP."
                              },
                              {
                                name: "weekly",
                                value: "Generate weekly album chart based off your last.fm profile.\n    **weekly 2x6**\n          2x6 weekly collage.\n    **weekly 3x3**\n          3x3 weekly collage.\n    **weekly 4x4**\n          4x4 weekly collage.\n    **weekly 5x5**\n          5x5 weekly collage."
                              },
                              {
                                name: "rym",
                                value: "Link rateyourmusic.com account\n     **rym set [username]**\n          Link your rateyourmusic.com account username.\n     **rym @user**\n          Link someone else's rym account.\n     **rym list**\n          List all on server."
                              },
                              {
                                name: "chart",
                                value: "Show your set chart\n     **chart set [image link]** (imgur album - first image will be submitted) or upload an image with message **chart set**\n          Set your chart.\n     **chart @user**\n          Show someone elses chart."
                              },
                              {
                                name: "choose",
                                value: "Choose an option from list separated by | - for example `!choose a | b | c`"
                              },
                              {
                                name: "joindate",
                                value: "Show your server join date\n     **joindate @user**\n          Get someone's join date."
                              }
                            ]  
                        }
                    });
                    if(authedUser || hasAdmin) {
                        bot.sendMessage({
                            to: channelID,
                            embed: {
                                color: 16711680,
                                fields: [
                                  {
                                    name: "disable",
                                    value: "Disable command(s)\n     **disable [command]**\n          Disable a command in this channel.\n     **disable [command] all**\n          Disable a command in **ALL** channels.\n     **disable all**\n          Disable all commands in all channels."
                                  },
                                  {
                                    name: "enable",
                                    value: "Enable command(s)\n     **enable [command]**\n          Enable a command in this channel.\n     **enable [command] all**\n          Enable a command in **ALL** channels.\n     **enable all**\n          Enable all commands in all channels."
                                  }
                                ]  
                            }
                        });
                    }
                    if(authedUser) {
                        bot.sendMessage({
                            to: channelID,
                            embed: {
                                color: 16711680,
                                fields: [
                                  {
                                    name: "adminrole",
                                    value: "Set the role required for using admin commands on the current server.\n     **disable [role]**\n"
                                  },
                                  {
                                    name: "authedusers",
                                    value: "Show the globally authorized user(s)\n     **authedusers**\n"
                                  }
                                ]  
                            }
                        });
                    }
                }    
            break;  
        }
    }
});
