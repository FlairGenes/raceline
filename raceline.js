 // 1. Wait for the onload even
window.addEventListener("load",function() {

      // James: I'm getting 'Invalid Module: Audio' here?
      var Q = window.Q = Quintus(
          { development: true, audioSupported: [ "ogg", "mp3" ] })
              .include("Audio, Sprites, Scenes, Input, 2D, Touch, UI")
              .setup({ maximize: true }).touch().enableSound();

      Q.input.keyboardControls();
      Q.input.joypadControls();

      Q.gravityX = 0;
      Q.gravityY = 0;

      Q.SPRITE_SHIP = 1;
      Q.SPRITE_WALL = 2;
      Q.SPRITE_GROUND = 3;
      Q.TILESIZE = 32;
      Q.SPRITE_LINE = 4;
      var line;
      var player;

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

          ctx.beginPath();
          ctx.moveTo(p.points[0][0], p.points[0][1]);
          for(var i =1, max = p.points.length;i<max;i++) {
            ctx.lineTo(p.points[i][0], p.points[i][1]);
          }
          ctx.lineWidth = 10;
          ctx.stroke();
        }
      })


      // Player
      Q.Sprite.extend("Ship", {
        init: function(p) {
          this._super(p, {
            type: Q.SPRITE_NONE,
            collisionMask: Q.SPRITE_WALL,
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
            asset: "CarPos1.png"
          });
          this.add("2d, reposition, aiBounce");

          Q.input.on("fire",this,"fire");

          this.activationObject = new Q.Sprite({ x: Q.width/2, y: Q.height/2, w: 100, h: 100 });
        },

        checkActivation: function() {
          if(!this.stage.search(this.activationObject, Q.SPRITE_WALL)) {
            this.p.activated = true;
          }

        },

        step: function(dt) {
          if(!this.p.activated) {
            return this.checkActivation();
          }

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
          }

          // Wrap angle to 0–360 degrees
          if(p.angle > 360) { p.angle -= 360; }
          if(p.angle < 0) { p.angle += 360; }

          if(Q.inputs["up"]) {
            var thrustX = Math.sin(p.angle * Math.PI / 180),
                thrustY = -Math.cos(p.angle * Math.PI / 180);

            p.vx += thrustX * p.acceleration;
            p.vy += thrustY * p.acceleration;
            
            // Play gas SFX! Or stop it if there's no more
            Q.audio.play("forward-single-2.mp3", 
                { debounce: 381 })
          } else {
            Q.audio.stop("forward-single-2.mp3")    
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
          
          this._super(p, {
            type: Q.SPRITE_LINE,
            collisionMask: Q.SPRITE_SHIP,
            omega: Math.random() * 100,
            skipCollide: true,
            points: []
          });
          this.add("1d");

          //this.on("hit.sprite",this,"collision");
        },

        createShape: function(p) {
          p = p || {};

          p.points = [];
          
          
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

          p.points.push([player.p.x, player.p.y]);
          if(p.points.length > 5000)
            p.points.shift();
       },
       
      });  
         
      
      // Return a x and y location from a row and column
      // in our tile map
      Q.tilePos = function(col,row, tile) {
        return { x: col*32, y: row*32, frame: tile };
      }
      Q.TileLayer.extend("TrackOne",{
        init: function() {
          this._super({
            dataAsset: 'track.json',
            sheet:     'spritesheet_track',
          });

        }
      });
      Q.TileLayer.extend("TrackOneWall",{
        init: function() {
          this._super({
            type: Q.SPRITE_WALL,
            dataAsset: 'trackwall.json',
            sheet:     'spritesheet_wall',
          });
        },
        setup: function() {
          // Clone the top level arriw
          var tiles = this.p.tiles = this.p.tiles.concat();
          var size = this.p.tileW;
          for(var y=0;y<tiles.length;y++) {
            var row = tiles[y] = tiles[y].concat();
            for(var x =0;x<row.length;x++) {
              var tile = row[x];

              if(tile == 0 ) {
                row[x] = 0;
              }
            }
          }
        }
        
      });
      

      Q.scene("level1",function(stage) {

        var wall = stage.collisionLayer(new Q.TrackOneWall());
        var map = stage.insert(new Q.TrackOne());
        //wall.setup();
        line = stage.insert(new Q.Line());
        player = stage.insert(new Q.Ship(Q.tilePos(17,17,0)));
        
        stage.add("viewport").follow(player);
        
        stage.on("step",function() {

        });
      });

      Q.scene('endGame',function(stage) {
        var container = stage.insert(new Q.UI.Container({
          x: Q.width/2, y: Q.height/2, fill: "rgba(255,255,255,0.5)"
          }));

          var button = container.insert(new Q.UI.Button({ x: 0, y: 0, fill: "#CCCCCC",
                                                         label: "Play Again" }))         
          var label = container.insert(new Q.UI.Text({x:10, y: -10 - button.p.h, 
                                       label: stage.options.label }));
          // When the button is clicked, clear all the stages
          // and restart the game.
          button.on("click",function() {
            Q.clearStages();
            Q.stageScene('level1');
          });

          // Expand the container to visibily fit it's contents
          container.fit(20);
        });

      

// Make sure penguin.png is loaded
Q.load("CarPos1.png, track.json, trackwall.json, spritesheet_track.png, spritesheet_wall.png, forward-single-2.mp3",function() {
    Q.sheet("spritesheet_wall","spritesheet_wall.png", { tileW: 32, tileH: 32 });
    Q.sheet("spritesheet_track","spritesheet_track.png", { tileW: 32, tileH: 32 });
    Q.stageScene("level1");
   
 });

    });
