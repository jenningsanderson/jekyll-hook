#!/usr/bin/env node
var config  = require('./config.json');
var fs      = require('fs');
var express = require('express');
var app     = express();
var queue   = require('queue-async');
var tasks   = queue(1);
var spawn   = require('child_process').spawn;
var commandLine = 'nothing yet'
//var email   = require('emailjs/email');
//var mailer  = email.server.connect(config.email);

app.use(express.bodyParser());

//This is the default behavior:
app.get('/', function(req, res){
    var site = req.query.site;
    var params = []
    if (site != undefined){
        if (config.sites[site] != undefined){
            params.push(config.sites[site].repo)
        }
    }

    if (params.length > 0){
        var output = run('./scripts/rake_tasks.sh', params);

        // Done running scripts
        console.log('Successfully ran rake listing');
        res.send(convertToHTML(commandLine.toString(),site));
        
    }else{
        res.send("Invalid site value");
    }
});

//query is GET data.
//This is the behavior for hitting /rake task
//example: ...8080/rake?task='put rake task here'
app.get('/rake', function(req, res){
    //local variables for the rake task
    var site = req.query.site;
    var rakeTask = req.query.task;
    var repo_path  = config.sites[site].repo;

    //feedback
    console.log('Got task: '+rakeTask.toString()+' for '+site.toString()+' site');

    //Prepare the array to pass
    var params = []
    params.push(repo_path);
    params.push(rakeTask);

    //Run the rake scripts
    run('./scripts/rake_script.sh', params, function(err) {
        if (err) {
            console.log('Failed to run task');
            res.send('build failed')
            if (typeof cb === 'function') cb();
            return;
        }
        // Done running scripts
        console.log('Successfully ran rake task: '+rakeTask);
        res.send('Site rebuilt successfully');
        
        if (typeof cb === 'function') cb();
        return;
    });
});

// Receive webhook post
app.post('/hooks/jekyll/:branch', function(req, res) {

    console.log('hello');

    // Close connection
    res.send(202);

    // Queue request handler
    tasks.defer(function(req, res, cb) {
        var data = JSON.parse(req.body.payload);
        var branch = req.params.branch;
        var params = [];

        // Parse webhook data for internal variables
        data.repo = data.repository.name;
        data.branch = data.ref.split('/')[2];
        data.owner = data.repository.owner.name;

        // End early if not permitted account
        if (config.accounts.indexOf(data.owner) === -1) {
            console.log(data.owner + ' is not an authorized account.');
            if (typeof cb === 'function') cb();
            return;
        }

        // End early if not permitted branch
        if (data.branch !== branch) {
            console.log('Not ' + branch + ' branch.');
            if (typeof cb === 'function') cb();
            return;
        }

        // Process webhook data into params for scripts
        /* repo    */ params.push(data.repo);
        /* branch  */ params.push(data.branch);
        /* owner   */ params.push(data.owner);
        /* giturl  */ params.push('git@' + config.gh_server + ':' + data.owner + '/' + data.repo + '.git');
        /* source  */ params.push(config.temp + '/' + data.owner + '/' + data.repo + '/' + data.branch + '/' + 'code');
        /* build   */ params.push(config.temp + '/' + data.owner + '/' + data.repo + '/' + data.branch + '/' + 'site');

        // Run build script
        run(config.scripts.build, params, function(err) {
            if (err) {
                console.log('Failed to build: ' + data.owner + '/' + data.repo);
                send('Your website at ' + data.owner + '/' + data.repo + ' failed to build.', 'Error building site', data);

                if (typeof cb === 'function') cb();
                return;
            }
            // Done running scripts
            console.log('Successfully rendered: ' + data.owner + '/' + data.repo);
            
            if (typeof cb === 'function') cb();
            return;
        });
    }, req, res);
});

// Start server
var port = process.env.PORT || 8080;
app.listen(port);
console.log('Listening on port ' + port);

//The run script
function run(file, params, cb) {
    var process = spawn(file, params);

    process.stdout.on('data', function (data) {
        console.log('' + data);
        commandLine = data;
    });

    process.stderr.on('data', function (data) {
        console.warn('' + data);
    });

    process.on('exit', function (code) {
        if (typeof cb === 'function') cb(code !== 0);
    });
}

function convertToHTML(chunk, site){
    var lineArray = chunk.split('\n');
    html = '</html><body><h1>This is the edit page</h1><ul>'
    for (var i = 0; i < lineArray.length-1; i++) {
        rakeTask = lineArray[i].substr(5,lineArray[i].indexOf('#')-5).trim().replace("arg1",'');
        html += '<li>' + lineArray[i].link('/rake?site='+site+'&task='+rakeTask + '</li>';
    }
    return html+'</ul>';
}
