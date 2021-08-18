<h3> MACRadius</h3>
<p> This is simple radius server to auth wifi users by MAC address<p>
<h4>Setup </h4>
<ul>
    <li>You should have nodejs</li>
    <li>Update .env file </li>
     <li>Run Command  <code>npm install</code></li>
     <li>Start App <code>node app.js</code></li>
     <li>Start Radius Server <code>node server.js</code></li>
</ul>
<p>
It will be better if you install forever to run app in background , to install forever <code>npm i forever -g</code> 
</p>
<ul>
<li>
run app <code>forever start app.js</code> 
</li>
<li>
run radius <code>forever start server.js</code> 
</li>
</ul>

