const express = require('express')
const app = express()
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var fs= require('fs')
let path = require('path');
const port = 3000
var dir = './Temp';
io.on('connection', (socket) => {
    var Files = {};
    var pause=false;
    console.log('a user connected');
    

    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
    socket.on('Start', function (data) {
        var Name = data['Name'];
        Files[Name] = { 
            FileSize : data['Size'],
            Data     : "",
            Downloaded : 0
        }
        var Place = 0;
        try{
            var Stat = fs.statSync(path.join(__dirname, "Temp/"+data["Name"]));
            if(Stat.isFile())
            {
                Files[Name]['Downloaded'] = Stat.size;
                Place = Stat.size / 524288;
            }
        }
        catch(er){
            console.log("An error occured :- "+er)
        }
        fs.open(path.join(__dirname, "Temp/"+data["Name"]), "a",0777, function(err, fd){
            if(err)
            {
                console.log(err);
            }
            else
            {
                Files[Name]['Handler'] = fd; 
                socket.emit('MoreData', { 'Place' : Place, Percent : 0 });
            }
        });
    });
    socket.on('Upload', function (data){
       
        var Name = data['Name'];
        Files[Name]['Downloaded'] += data['Data'].length;
        Files[Name]['Data'] += data['Data'];
        if(Files[Name]['Downloaded'] == Files[Name]['FileSize']) 
        {
            fs.write(Files[Name]['Handler'], Files[Name]['Data'], null, 'Binary', function(err, Writen){
                socket.emit('Done');
            });
        }
        else if(Files[Name]['Data'].length > 10485760){ 
            fs.write(Files[Name]['Handler'], Files[Name]['Data'], null, 'Binary', function(err, Writen){
                Files[Name]['Data'] = ""; 
                var Place = Files[Name]['Downloaded'] / 524288;
                var Percent = (Files[Name]['Downloaded'] / Files[Name]['FileSize']) * 100;
                if(!pause)
                socket.emit('MoreData', { 'Place' : Place, 'Percent' :  Percent});
            });
        }
        else
        {
            var Place = Files[Name]['Downloaded'] / 524288;
            var Percent = (Files[Name]['Downloaded'] / Files[Name]['FileSize']) * 100;
            if(!pause)
            socket.emit('MoreData', { 'Place' : Place, 'Percent' :  Percent});
        }
        
    });
    socket.on('pause', function (){
        pause=true;
    });
    socket.on('play', function (data){
        pause=false;
        var Name = data['Name'];
        console.log(Name)
        var Place = Files[Name]['Downloaded'] / 524288;
        var Percent = (Files[Name]['Downloaded'] / Files[Name]['FileSize']) * 100;
        socket.emit('MoreData', { 'Place' : Place, 'Percent' :  Percent});
    });
    socket.on('terminate', function (data){
        pause=true;
        var Name = data['Name'];
        fs.close(Files[Name]['Handler'],(err)=>{console.log(err)});
        Files[Name]={};
        
        console.log(path.join(__dirname, "Temp/"+data["Name"]))
        fs.unlink(path.join(__dirname, "Temp/"+data["Name"]),(err)=>{
            if(err!=null)
            console.log(err)
            else
            console.log("File Deleted")
        })
    });
});
  
app.get('/', (req, res) => {
  res.sendFile("./index.html",{root: __dirname })
})
http.listen(port,()=>{
    console.log("Server at 3000");
})