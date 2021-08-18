require('dotenv').config()
var radius = require('radius');
var sqlite3 = require('sqlite3').verbose();
var dgram = require("dgram");

var db;

function openDB(){
    db = new sqlite3.Database(process.env.DBNAME);
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
 
function saveLog(req,clientMAC){

    db.serialize(()=>{
        db.get('SELECT rowid, * from log where mac = ?', [clientMAC], function(e,row){
                if(row !== undefined){
                        //var v = row.visits +1;
                        db.run('update log SET visits=?, lastseen=datetime("now") WHERE rowid=? ', [ ++row.visits ,row.rowid], function(err) {
                            if (err) {
                                onsole.log(err.message);
                            }
                            console.log("update visits for "+ row.mac+": " + row.visits++);
                            });
                            closeDB();
                }else{
                    db.run('INSERT INTO log(req,mac,visits,lastseen) VALUES(?,?,1, datetime("now"))', [req,clientMAC], function(err) {
                        if (err) {
                            console.log(err.message);
                        }
                            console.log("New user has been added");
                        })
                        closeDB();
                   
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