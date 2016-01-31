 // 1. Wait for the onload even
window.addEventListener("load",function() {

      // James: I'm getting 'Invalid Module: Audio' here?
      var Q = window.Q = Quintus(
          { development: true, audioSupported: [ "ogg", "mp3" ] })
              .include("Audio, Sprites, Scenes, Input, 2D, Touch, UI")
              .setup({ 
                  //maximize: true,
                width: 50 * 32,
                height: 50 * 32,
                scaleToFit: true
               })
              .touch()
              .enableSound();
      var mute_sound = false;      
      // No image smoothing!
      Q.ctx.imageSmoothingEnabled = false;
      Q.ctx.mozImageSmoothingEnabled = false;
      Q.ctx.webkitImageSmoothingEnabled = false;   
    //   Q.ctx.fontSize = "500%"; 

      // Control setup
      Q.input.keyboardControls();
      Q.input.joypadControls();
      Q.input.touchControls({
          controls: [
              ['down', '🔊'],
              ['up', '↑'],
              [],
              
              ['left', '←'],
              ['right', '→']
          ]
      });

      Q.gravityX = 0;
      Q.gravityY = 0;

      Q.SPRITE_SHIP = 1;
      Q.SPRITE_WALL = 2;
      Q.SPRITE_GROUND = 3;
      Q.TILESIZE = 32;
      Q.SPRITE_LINE = 4;
      var line;
      var player;
      var LINE_LENGTH = 750;
      var carmoving = false;

      function getTileSize() {
          var twid = Q.width / 20;
          var thigh = Q.height / 20;
          if(twid < thigh)
            return twid;
          else
            return thigh;
      }

      Q.component("reposition", {

        added: function() {

          this.entity.on("step",this,"step");
        },

        step: function(dt) {
          var p = this.entity.p;
          var maxSide = Math.sqrt(p.h * p.h  + p.w + p.w);
          if(p.x > Q.width + maxSide) { p.x -= Q.width + maxSide }
          if(p.x < -maxSide) { p.x += Q.width + maxSide }

          if(p.y > Q.height + maxSide) { p.y -= Q.height + maxSide }
          if(p.y < -maxSide) { p.y += Q.height + maxSide }
        }

      });

      Q.Sprite.extend("VectorSprite",{

        draw: function(ctx) {
          var p = this.p;
          ctx.fillStyle = "#FFF";

          ctx.beginPath();
          ctx.moveTo(p.points[0][0], p.points[0][1]);
          for(var i =1, max = p.points.length;i<max;i++) {
            ctx.lineTo(p.points[i][0], p.points[i][1]);
          }
          ctx.fill();
        }
      });
      Q.Sprite.extend("LineSprite", {
        draw: function(ctx) {
          var p = this.p;
          ctx.strokeStyle = '#ff0000';
          this.p.type = Q.SPRITE_LINE;
          ctx.beginPath();
          ctx.moveTo(p.points[0][0], p.points[0][1]);
          for(var i =1, max = p.points.length;i<max;i++) {
            ctx.lineTo(p.points[i][0], p.points[i][1]);
          }
          ctx.lineWidth = 10;
          ctx.stroke();
        }
      });
      Q.UI.Text.extend("Score",{ 
        init: function(p) {
            this._super({
            label: "0",
            color: "#ffffff"
            });

            Q.state.on("change.score",this,"score");
        },

        score: function(score) {
            score = Q.state.get("score");
            this.p.label = score + ' ' ;
        },
        step: function(){
            this.p.x = player.p.x - 50;
            this.p.y = player.p.y - 100;
            //this.p.x = player.p.y - Q.height/3;
        }
        });
      Q.UI.Text.extend("Level",{ 
        init: function(p) {
            this._super({
            label: "level: " + Q.state.get("level"),
            color: "#ffffff"
            });

            Q.state.on("change.level",this,"level");
        },

        level: function(score) {
            var level = Q.state.get("level");
            this.p.label = "level:" +  level;
        },
        step: function(){
            this.p.x = player.p.x + 50;
            this.p.y = player.p.y - 100;
            //this.p.x = player.p.y - Q.height/3;
        }
        });
      // Player
      Q.Sprite.extend("Ship", {
        init: function(p) {
          this._super(p, {
            type: Q.SPRITE_SHIP,
            collisionMask: Q.SPRITE_WALL | Q.SPRITE_LINE,
            w: 25,
            h: 25,
            omega: 0,                   // omega: rate of angle change
            omegaDelta: 150,            // amount of omega applied when turning
            maxOmega: 400,
            acceleration: 20,           // tweak acceleration and reisstance for handling!
            speed: 0,
            resistance: 0.04,
            //points: [ [0, -10 ], [ 5, 10 ], [ -5,10 ]],
            bulletSpeed: 500,
            activated: false,
            asset: "CarPos1.png",
            sensor: true
          });
          this.add("2d, reposition, aiBounce");
          this.on("hit",this,"collision");       // register a collision event callback
          carmoving = false;
          Q.input.on("fire",this,"fire");

          this.activationObject = new Q.Sprite({ x: Q.width/2, y: Q.height/2, w: 100, h: 100 });
          //this.on("sensor");
        },
        // collision: play a pop sound effect ^.^
        collision: function(col) {
            if (mute_sound == false) Q.audio.play("pops.mp3", { debounce: 500 })
        },

        checkActivation: function() {
          if(!this.stage.search(this.activationObject, Q.SPRITE_WALL)) {
            this.p.activated = true;
            
          }

        },
        checkLine: function() {
            if(carmoving){
                
            var bb = {
                ix: player.p.x,
                iy: player.p.y,
                ax: player.p.x + player.p.w,
                ay: player.p.y + player.p.h
                }            
            line.p.points.forEach(function(p){
                
                if( bb.ix <= p[0] && p[0] <= bb.ax && bb.iy <= p[1] && p[1] <= bb.ay ) {
                    Q.state.inc("score", 1);
                    //load level 2
                    if(Q.state.get("level") === 1 && Q.state.get("score") >= 1000) {
                        Q.clearStages();
                        Q.stageScene('level2');
                    }
                    //end game
                    if(Q.state.get("level") === 2 && Q.state.get("score") >= 1000) {
                        Q.clearStages();
                        Q.stageScene('endGame');
                    }
                    return;

                }
            
                
            });
            }
            //no collide
            Q.state.dec("score", 1);
            if(Q.state.get("score") < 0)
            Q.state.set("score", 0) ;

        },
        step: function(dt) {
          if(!this.p.activated) {
            return this.checkActivation();
          }
          this.checkLine();
          
          var p = this.p;
          p.angle += p.omega * dt;
        //   p.omega *=  1 - 1 * dt;    // old: decay omega if not turning
          p.omega = 0                   // new: no omega if not  turning
          
           // Old turning code: turn buttons 'accelerated' rotation
        //   if(Q.inputs["right"]) { 
        //     p.omega += p.omegaDelta * dt;
        //     if(p.omega > p.maxOmega) { p.omega = p.maxOmega; }
        //   } else if(Q.inputs["left"]) {
        //     p.omega -= p.omegaDelta * dt;
        //     if(p.omega < -p.maxOmega) { p.omega = -p.maxOmega; }
        //   }
          
          // New turning code: turn buttons 'set' rotation
          if(Q.inputs["right"]) { 
            p.omega = p.omegaDelta;
          } else if(Q.inputs["left"]) {
            p.omega = -p.omegaDelta;
          } else {
            Q.audio.stop("turn-2.mp3")
          }

          // Wrap angle to 0–360 degrees
          if(p.angle > 360) { p.angle -= 360; }
          if(p.angle < 0) { p.angle += 360; }

          if(Q.inputs["up"]) {
            var thrustX = Math.sin(p.angle * Math.PI / 180),
                thrustY = -Math.cos(p.angle * Math.PI / 180);

            p.vx += thrustX * p.acceleration;
            p.vy += thrustY * p.acceleration;
            carmoving = true;
            // Play gas SFX! Or stop it if there's no more
            if (mute_sound == false) Q.audio.play("forward-single-2.mp3", { debounce: 381 })
          } else {
              carmoving = false;
            Q.audio.stop("forward-single-2.mp3")    
          }
          
          // down is toggle mute
          if(Q.inputs["down"]) {
              mute_sound = !mute_sound;
              if (mute_sound == true) {
                  Q.audio.stop();
              } else {
                  Q.audio.play("bg-music.mp3", { loop: true })
              }
              
          }

            // decay velcoity if no thrust            
            p.vx = p.vx * (1 - p.resistance);
            p.vy = p.vy * (1 - p.resistance);    
        },

        reset: function() {
          Q._extend(this.p,{ 
            x: Q.width/2,
            y: Q.height/2,
            vx: 0,
            vy: 0,
            angle: 0,
            omega: 0,
            activated: false
          });

        }
      });
      
      
      //Line
      Q.LineSprite.extend("Line", {
        init: function(p) {
          p = this.createShape(p);
          
          this._super(p,{
              type: Q.SPRITE_LINE,
          });

        },

        createShape: function(p) {
          p = p || {};

          p.points = [];
          p.points.push([p.x , p.y + 40])
          p.sensor = true;
          p.type = Q.SPRITE_LINE;
          p.cx = 0;
          p.cy = 0;   
          p.w = Q.width;
          p.h = Q.height;
          p.x = 0;
          p.y = 0;

          p.angle = 0;
         return p;
       },
       step: function(){
          var p = this.p;
            var thrustX = Math.sin(player.p.angle * Math.PI / 180),
                thrustY = -Math.cos(player.p.angle * Math.PI / 180);
          p.points.push([player.p.x - thrustX * 40 , player.p.y - thrustY * 40]);
          if(p.points.length > LINE_LENGTH)
            p.points.shift();
       },
       
      });  
         
      
      // Return a x and y location from a row and column
      // in our tile map
      Q.tilePos = function(col,row, tile) {
        return { x: col*32, y: row*32, frame: tile };
      }

      Q.TileLayer.extend("TrackWall",{
        //add collision code here
      });
      
      Q.scene("title",function(stage) {
        Q.state.set("level",0);

        // Clear the hud out
        //Q.clearStage(1); 

        var bg = stage.insert(new Q.Sprite({w: Q.width, h: Q.height}));
        stage.insert(new Q.UI.Text({label: "RACE LINE", x: Q.width/2, y: Q.height/2, size: 100, color:"white"}));
        var button = stage.insert(new Q.UI.Button(
            {
              x: Q.width/2, y: Q.height/4 * 3, w: Q.width/8, h: Q.height/8, size: 80, fill: "#CCCCCC", label: "Play"
            }));
          button.on("click",function() {
            Q.audio.play("bg-music.mp3", { loop: true })
            Q.clearStages();
            Q.stageScene('level1');
          });                             
        });
      Q.scene("level1",function(stage) {
        Q.state.set("level",1);
        //Q.state.reset({score: 0});
        var wall = stage.collisionLayer(new Q.TrackWall({
            type: Q.SPRITE_WALL,
            dataAsset: 'trackwall.json',
            sheet:     'spritesheet_wall',
        }));
        var map = stage.insert(new Q.TileLayer({
            dataAsset: 'track.json',
            sheet:     'spritesheet_track'
        }));
        //wall.setup();
        
        // Insert player and line into stage using tile co-ordinates
        // line = stage.insert(new Q.Line(Q.tilePos(17,17,0)));
        // player = stage.insert(new Q.Ship(Q.tilePos(17,17,0)));
        line = stage.insert(new Q.Line(Q.tilePos(20,16,0)));
        player = stage.insert(new Q.Ship(Q.tilePos(20,16,0)));
        
        var viewport = stage.add("viewport").follow(player);
        stage.viewport.scale;
        stage.insert(new Q.Score());
        stage.insert(new Q.Level());
                Q.state.set("score", 0);
        stage.on("step",function() {

        });
      });
      Q.scene("level2",function(stage) {
        Q.state.set("level",2);
        //Q.state.reset({score: 0});
        var wall = stage.collisionLayer(new Q.TrackWall({
            type: Q.SPRITE_WALL,
            dataAsset: 'trackwall.json',
            sheet:     'spritesheet_wall',
        }));
        var map = stage.insert(new Q.TileLayer({
            dataAsset: 'track.json',
            sheet:     'spritesheet_track'
        }));
        //wall.setup();
        
        // Insert player and line into stage using tile co-ordinates
        // line = stage.insert(new Q.Line(Q.tilePos(17,17,0)));
        // player = stage.insert(new Q.Ship(Q.tilePos(17,17,0)));
        line = stage.insert(new Q.Line(Q.tilePos(20,16,0)));
        player = stage.insert(new Q.Ship(Q.tilePos(20,16,0)));
        
        var viewport = stage.add("viewport").follow(player);
        stage.viewport.scale;
        stage.insert(new Q.Score());
        stage.insert(new Q.Level());
                Q.state.set("score", 0);
        stage.on("step",function() {

        });
      });

      Q.scene('endGame',function(stage) {
        Q.state.set("level",0);

        // Clear the hud out
        //Q.clearStage(1); 

        var bg = stage.insert(new Q.Sprite({w: Q.width, h: Q.height}));
        stage.insert(new Q.UI.Text({label: "WINNER!", x: Q.width/2, y: Q.height/2, size: 100, color:"white"}));
        var button = stage.insert(new Q.UI.Button(
            {
              x: Q.width/2, y: Q.height/4 * 3, w: Q.width/8, h: Q.height/8, size: 80, fill: "#CCCCCC", label: "Play Again"
            }));
          button.on("click",function() {
            //Q.audio.play("bg-music.mp3", { loop: true })
            Q.clearStages();
            Q.stageScene('title');
          });                             
        });

      

// Make sure penguin.png is loaded
Q.load(
    ["CarPos1.png",
    "track.json",
    "trackwall.json",
    "spritesheet_track.png",
    "spritesheet_wall.png",
    "forward-single-2.mp3",
    "pops.mp3",
    "bg-music.mp3",
    "turn-2.mp3"],
    function() {
        Q.sheet("spritesheet_wall","spritesheet_wall.png", { tileW: 32, tileH: 32 });
        Q.sheet("spritesheet_track","spritesheet_track.png", { tileW: 32, tileH: 32 });
        Q.stageScene("title");   
});

});
