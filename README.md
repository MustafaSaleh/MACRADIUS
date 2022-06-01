# MACRadius
<p> This is simple radius server to auth wifi users by MAC address<p>
<p>Thanks <a href="https://github.com/retailnext/node-radius"> node-radius </a></p>
<h4>Setup </h4>
<ul>
    <li>You should have nodejs</li>
    <li>Update .env file 
        <code>SESSION_SECRET=thisismysecrctekeyfhrgfgrfrty84fwir767
        DBNAME=./database/users.db 
        USERNAME=radius_admin 
        PASSWORD=radius_password
        RADIUS_PORT=1645 
        RADIUS_SECRET=This_Secret_will_use_at_Meraki_Dashboard 
        </code> 
    </li>
    <li>Create folder with name database if not available </li>
     <li>Run Command  <code>npm install</code></li>
     <li>Start App <code>node app.js</code></li>
</ul>
<p>
It will be better if you install forever to run app in background, to install forever <code>npm i forever -g</code> 
</p>
<ul>
<li>
run app <code>forever start app.js</code> 
</li>
</ul>
<h3>Setup Meraki SSID to Auth with MAC address</h3>

<ul>
    <li>Dashboard Login</li>    
    <li>Wireless> Configur> Access control </li>  
    <li> At <b>Association requirements</b> enable <b> MAC-based access control (no encryption)</b></li> 
    <li><img src="https://github.com/MustafaSaleh/MACRadius/blob/master/setup_meraki_mac_auth/ass_req.png?raw=true" alt="meraki" /></li>
    <li>Scroll down to configure <b>RADIUS servers</b></li>
    <li><img src="https://github.com/MustafaSaleh/MACRadius/blob/master/setup_meraki_mac_auth/radius.png?raw=true" alt="meraki" /></li>
    
    
</ul>

