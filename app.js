require('dotenv').config()
var sqlite3 = require('sqlite3').verbose();

//radius
var radius = require('radius');
var dgram = require("dgram");

//express
var express = require('express');
const sessions = require('express-session');
var bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");
// create express app
var app = express();
var http = require('http')
var path = require('path');


var server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);


const port = 4093



app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));



const oneDay = 1000 * 60 * 60 * 24;
//session middleware
app.use(sessions({
    secret: process.env.SESSION_SECRET,
    saveUninitialized:true,
    cookie: { maxAge: oneDay },
    resave: false
}));

app.use(express.static(__dirname));
app.use(cookieParser());

app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());



var db = openDB();

function openDB(){
  db = new sqlite3.Database(process.env.DBNAME);
  db.run('CREATE TABLE IF NOT EXISTS users(id TEXT, name TEXT, mac TEXT)');
  //db.run('DROP TABLE log')
  db.run('CREATE TABLE IF NOT EXISTS log( req TEXT, mac TEXT, visits INTEGER, lastseen TEXT)');
}

function closeDB(){
  db.close((err) => {
      if (err) {
        console.log('There is some error in closing the database');
      }else{
        console.log('Closing the database connection.');

      }
    });
}



app.get('/', function(request, response) {
	response.sendFile(path.join(__dirname + '/views/login.html'));
});

app.use(function (req, res, next) {
  //console.log(req.url)
  //console.log(req.session)
  if(req.url == '/auth' || req.url == '/'){
    next()
  }
    if(req.session.loggedin == null){
      res.redirect('/')
    }else{
      next()
    } 
})


app.get('/home', function(req,res){
  
    db.all(`SELECT users.rowid, users.name, users.mac, log.lastseen, log.visits FROM users LEFT JOIN log ON users.mac = log.mac`, [], (err, clients) => {
    if (err) {
              console.log(err);
    }
    console.log(clients)
      res.render("home", { clients: clients });
      console.log("Entry displayed successfully");
    });
 
});


  app.get('/clients', function(req,res){

        db.all(`SELECT rowid, * FROM users ORDER BY rowid DESC`, [], (err, clients) => {
        if (err) {
                  throw err;
        }
          res.json(clients);
          console.log("Entry displayed successfully");
        });
  });



  app.get('/log', function(req,res){

    var data = "";  
  
        db.all(`SELECT rowid, * FROM log ORDER BY rowid`, [], (err, rows) => {
        if (err) {
                  throw err;
        }
        data +="<table>"
        
        rows.forEach((row) => {             
             data +="<tr><td>"+row['rowid']+"</td><td>"+ row['req']+"</td><td>"+ row['mac']+"</td><td>"+ row['visits']+"</td></tr>"

        });
        data +="</table>";

        res.send(data);
        console.log("logs successfully");

        
        });

   
  });





  app.get('/log/del', function(req,res){

        db.all(`DELETE FROM log`, [], (err, rows) => {
        if (err) {
                  throw err;
        }
       
        res.send("log cleared");
        console.log("logs successfully");

        });

   
  });


  app.post('/add', function(req,res){
      console.log(req)
    db.serialize(()=>{
      db.run('INSERT INTO users(name,mac) VALUES(?,?)', [ req.body.name,req.body.mac], function(err) {
        if (err) {
          return console.log(err.message);
        }
        console.log("New user has been added");
        res.send("New user has been added into the database with and Name = "+req.body.name);
      });
  });
  });



  app.get('/view/:id', function(req,res){
    db.serialize(()=>{
      db.each('SELECT rowid ID, name , mac NAME FROM users WHERE rowid =?', [req.params.id], function(err,row){     
        if(err){
          res.send("Error encountered while displaying");
          return console.error(err.message);
        }
        res.send(` ID: ${row.ID},    Name: ${row.NAME} , Mac: ${row.Mac}`);
        console.log("Entry displayed successfully");
      });
    });
  });



  app.get('/update/:id/:name/:mac', function(req,res){
    db.serialize(()=>{
      db.run('UPDATE users SET name = ? , mac = ? WHERE rowid = ?', [req.params.name,req.params.mac,req.params.id], function(err){
        if(err){
          res.send("Error encountered while updating");
          return console.error(err.message);
        }
        res.send("Entry updated successfully");
        console.log("Entry updated successfully");
      });
    });
  });


  app.get('/del/:id', function(req,res){
    db.serialize(()=>{
      db.run('DELETE FROM users WHERE rowid = ?', req.params.id, function(err) {
        if (err) {
          res.send("Error encountered while deleting");
          return console.error(err.message);
        }
        res.send("Entry deleted");
        console.log("Entry deleted");
      });
    });
  });


  app.get('/close', function(req,res){
    db.close((err) => {
      if (err) {
        res.send('There is some error in closing the database');
        return console.error(err.message);
      }
      console.log('Closing the database connection.');
      res.send('Database connection successfully closed');
    });
  });


  app.post('/auth', function(request, response) {
    var username = request.body.username;
    var password = request.body.password;

    if (username && password) {
        if (username == process.env.USERNAME & password == process.env.PASSWORD ) {
          request.session.loggedin = true;
          request.session.username = username;
          openDB()
          response.redirect('/home');
        } else {
          console.log('Incorrect Username and/or Password!');
        }			
    } else {
      console.log('Error Username and Password!');
    }

    //response.redirect('/');
  });


  app.get('/logout', function(req, res){
    console.log('Logout');
    req.session.destroy(null)
    res.redirect("/"); 
    /*
    db.close((err) => {
      if (err) {
        console.log('There is some error in closing the database');
        return console.error(err.message);
      }else{
        console.log('Closing the database connection.');
        req.session.destroy(null)
        res.redirect("/"); 
      }
      
    });
    */

   });


//start RADIUS
function saveLog(req,clientMAC){

  db.serialize(()=>{
    db.get('SELECT rowid, * from users where mac = ?', [clientMAC], function(e,row){
            if(row == undefined){
              io.sockets.emit("newClient", clientMAC);
            }
        });

      db.get('SELECT rowid, * from log where mac = ?', [clientMAC], function(e,row){
       
              if(row !== undefined){
                      //var v = row.visits +1;
                      db.run('update log SET visits=?, lastseen=datetime("now") WHERE rowid=? ', [ ++row.visits ,row.rowid], function(err) {
                          if (err) {
                              onsole.log(err.message);
                          }
                          console.log("update visits for "+ row.mac+": " + row.visits++);
                          });
                         // closeDB();
              }else{
                
                  db.run('INSERT INTO log(req,mac,visits,lastseen) VALUES(?,?,1, datetime("now"))', [req,clientMAC], function(err) {
                      if (err) {
                          console.log(err.message);
                      }
                          console.log("New user has been added");
                      })
                     // closeDB();
                 
              }
              
      })
      

  });

}

function RadiusServer(settings) {
  this.config = settings || {};
  this.port = this.config.port || 1645;
  this.secret = this.config.secret || "";
  this.server = null;

  this.ACCESS_REQUEST = 'Access-Request';
  this.ACCESS_DENIED = 'Access-Reject';
  this.ACCESS_ACCEPT = 'Access-Accept';
};

RadiusServer.prototype.start = function () {
  var self = this;

  // create the UDP server
  self.server = dgram.createSocket("udp4");
   
  self.server.on('message', function (msg, rinfo) {
      openDB();
      if (msg && rinfo) {

          // decode the radius packet
          var packet;
          console.log(self.secret)
          console.log(self.msg)
          try {
              packet = radius.decode({ packet: msg, secret: self.secret });
          }
          catch (err) {
              console.log('Unable to decode packet.');
              return;
          }
 
          // if we have an access request, then
          if (packet && packet.code == self.ACCESS_REQUEST) {
             console.log(packet.attributes['User-Name'])  
              console.log( packet.attributes)

              // get user/password from attributes
              var username = packet.attributes['User-Name'];
              var password = packet.attributes['User-Password'];

              // verify credentials, make calls to 3rd party services, then set RADIUS response
            

              db.serialize(()=>{
                  db.get('SELECT * FROM users WHERE mac =?', username, function(erro,row){  
                  var responseCode = self.ACCESS_DENIED;
                    if(erro){
                      return console.error(erro.message);
                    }
                    
                  if(row !== undefined){
                      responseCode = self.ACCESS_ACCEPT;
                      console.log(`${row.name}`)
                      console.log("Entry displayed successfully");
                                      // build the radius response
                          saveLog(JSON.stringify(packet.attributes),packet.attributes['User-Name'])           
                      }else{
                          saveLog(JSON.stringify(packet.attributes),packet.attributes['User-Name'])
                      }

                      var response = radius.encode_response({
                          packet: packet,
                          code: responseCode,
                          secret: self.secret
                      });
                                  // send the radius response
                                  self.server.send(response, 0, response.length, rinfo.port, rinfo.address, function (err, bytes) {
                                      if (err) {
                                          console.log('Error sending response to ', rinfo);
                                          console.log(err);
                                      }
                                  });

                       console.log('Access-Request for "' + username + '" (' + responseCode + ').');    
                  });
                 
               });

          }
      }
  });
   
  self.server.on('listening', function () {
      var address = self.server.address();
      console.log('Radius server listening on port ' + address.port);
  });
   
  self.server.bind(self.port);
};

var rServer = new RadiusServer({server: "0.0.0.0", port: process.env.RADIUS_PORT, secret: process.env.RADIUS_SECRET });
rServer.start();


//end RADIUS


// socket listening
io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('newClient', (msg) => {
    io.emit('newClient', msg);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});




  server.listen(port, () => {
    console.log(`Admin is running at http://localhost:${port}`)
  })