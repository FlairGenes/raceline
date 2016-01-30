 // 1. Wait for the onload even
window.addEventListener("load",function() {

      var Q = window.Q = Quintus({ development: true })
              .include("Sprites, Scenes, Input, 2D, Touch, UI")
              .setup({ maximize: true }).touch();

      Q.input.keyboardControls();
      Q.input.joypadControls();

      Q.gravityX = 0;
      Q.gravityY = 0;

      Q.SPRITE_SHIP = 1;
      Q.SPRITE_WALL = 2;
      Q.TILESIZE = 64;
      Q.SPRITE_LINE = 4;
      var line;
      var player;

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


      //Player
      Q.Sprite.extend("Ship", {
        init: function(p) {
          this._super(p, {
            type: Q.SPRITE_NONE,
            collisionMask: Q.SPRITE_WALL,
            w: 25,
            h: 25,
            omega: 0,
            omegaDelta: 700,
            maxOmega: 400,
            acceleration: 2,
            speed: 0,
            resistance: 0.01,
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
          p.omega *=  1 - 1 * dt;

          if(Q.inputs["right"]) { 
            p.omega += p.omegaDelta * dt;
            if(p.omega > p.maxOmega) { p.omega = p.maxOmega; }
          } else if(Q.inputs["left"]) {
            p.omega -= p.omegaDelta * dt;
            if(p.omega < -p.maxOmega) { p.omega = -p.maxOmega; }
          }

          if(p.angle > 360) { p.angle -= 360; }
          if(p.angle < 0) { p.angle += 360; }

          if(Q.inputs["up"]) {
            var thrustX = Math.sin(p.angle * Math.PI / 180),
                thrustY = -Math.cos(p.angle * Math.PI / 180);

            p.vx += thrustX * p.acceleration;
            p.vy += thrustY * p.acceleration;
          }

            //drag
            var thrustX = Math.sin(p.angle * Math.PI / 180),
                thrustY = -Math.cos(p.angle * Math.PI / 180);

            p.vx += thrustX ;
            p.vy += thrustY ;            
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
          p.points.push([p.point.x - 1, p.point.y - 1 ]);
          p.points.push([p.point.x + 1, p.point.y - 1 ]);
          p.points.push([p.point.x + 1, p.point.y + 1 ]);
          p.points.push([p.point.x - 1, p.point.y + 1 ]);
          
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
      
      Q.VectorSprite.extend("Wall", {
        init: function(p) {
          p = this.createShape(p);

          this._super(p, {
            type: Q.SPRITE_WALL,
            collisionMask: Q.SPRITE_SHIP,
            omega: Math.random() * 100,
            skipCollide: true,
            points: []
          });
          this.add("2d");

          //this.on("hit.sprite",this,"collision");
        },

        createShape: function(p) {
          p = p || {};

          p.points = [];
          
          var m = Q.TILESIZE;
          var w = Q.TILESIZE / 2;
          if(p.wall === "leftwall") {
              //top left
              p.points.push([w,0]);
              //top right
              p.points.push([m,0]);
              //bottom right
              p.points.push([m,m]);
              //bottom left
              p.points.push([w,m]);
              p.assets
               
          }
          if(p.wall === "rightwall") {
              //top left
              p.points.push([0,0]);
              //top right
              p.points.push([w,0]);
              //bottom right
              p.points.push([w,m]);
              //bottom left
              p.points.push([0,m]);
          }
          if(p.wall === "topwall") {
              //top left
              p.points.push([0,w]);
              //top right
              p.points.push([m,w]);
              //bottom right
              p.points.push([m,m]);
              //bottom left
              p.points.push([0,m]);
          }
          if(p.wall === "bottomwall") {
              //top left
              p.points.push([0,0]);
              //top right
              p.points.push([m,0]);
              //bottom right
              p.points.push([m,w]);
              //bottom left
              p.points.push([0,w]);
          }
          if(p.wall === "topleftcorner") {
              //top left
              p.points.push([w,w]);
              //top right
              p.points.push([m,w]);
              //bottom right
              p.points.push([m,m]);
              //bottom left
              p.points.push([w,m]);
          }
          if(p.wall === "toprightcorner") {
              //top left
              p.points.push([0,w]);
              //top right
              p.points.push([w,w]);
              //bottom right
              p.points.push([w,m]);
              //bottom left
              p.points.push([0,m]);
          }
          if(p.wall === "bottomleftcorner") {
              //top left
              p.points.push([w,0]);
              //top right
              p.points.push([m,0]);
              //bottom right
              p.points.push([m,w]);
              //bottom left
              p.points.push([w,w]);
          }
          if(p.wall === "bottomrightcorner") {
              //top left
              p.points.push([0,0]);
              //top right
              p.points.push([w,0]);
              //bottom right
              p.points.push([w,w]);
              //bottom left
              p.points.push([0,w]);
          }
          
          
          p.cx = 0;
          p.cy = 0;   
          p.w = Q.TILESIZE;
          p.h = Q.TILESIZE;
          p.x = p.x * Q.TILESIZE;
          p.y = p.y * Q.TILESIZE;

          p.angle = 0;
         return p;
       },

      });
      



      Q.scene("level1",function(stage) {
        
        line = stage.insert(new Q.Line({point:{x:9 * Q.TILESIZE, y:9 * Q.TILESIZE}}));
        player = stage.insert(new Q.Ship({ x:9 * Q.TILESIZE, y:9 * Q.TILESIZE}));
        
            
            //outside
            stage.insert(new Q.Wall({ x: 1, y: 0, wall:"topleftcorner" }));
            stage.insert(new Q.Wall({ x: 1, y: 1, wall:"leftwall" }));
            stage.insert(new Q.Wall({ x: 1, y: 2, wall:"leftwall" }));
            stage.insert(new Q.Wall({ x: 1, y: 3, wall:"leftwall" }));
            stage.insert(new Q.Wall({ x: 1, y: 4, wall:"leftwall" }));
            stage.insert(new Q.Wall({ x: 1, y: 5, wall:"leftwall" }));
            stage.insert(new Q.Wall({ x: 1, y: 6, wall:"leftwall" }));
            stage.insert(new Q.Wall({ x: 1, y: 7, wall:"leftwall" }));
            stage.insert(new Q.Wall({ x: 1, y: 8, wall:"leftwall" }));
            stage.insert(new Q.Wall({ x: 1, y: 9, wall:"leftwall" }));
            stage.insert(new Q.Wall({ x: 1, y: 10, wall:"bottomleftcorner" }));
            
            stage.insert(new Q.Wall({ x: 2, y: 0, wall:"topwall" }));
            stage.insert(new Q.Wall({ x: 3, y: 0, wall:"topwall" }));
            stage.insert(new Q.Wall({ x: 4, y: 0, wall:"topwall" }));
            stage.insert(new Q.Wall({ x: 5, y: 0, wall:"topwall" }));
            stage.insert(new Q.Wall({ x: 6, y: 0, wall:"topwall" }));
            stage.insert(new Q.Wall({ x: 7, y: 0, wall:"topwall" }));
            stage.insert(new Q.Wall({ x: 8, y: 0, wall:"topwall" }));
            stage.insert(new Q.Wall({ x: 9, y: 0, wall:"topwall" }));
            stage.insert(new Q.Wall({ x: 10, y: 0, wall:"topwall" }));
            
            stage.insert(new Q.Wall({ x: 11, y: 0, wall:"toprightcorner" }));
            stage.insert(new Q.Wall({ x: 11, y: 1, wall:"rightwall" }));
            stage.insert(new Q.Wall({ x: 11, y: 2, wall:"rightwall" }));
            stage.insert(new Q.Wall({ x: 11, y: 3, wall:"rightwall" }));
            stage.insert(new Q.Wall({ x: 11, y: 4, wall:"rightwall" }));
            stage.insert(new Q.Wall({ x: 11, y: 5, wall:"rightwall" }));
            stage.insert(new Q.Wall({ x: 11, y: 6, wall:"rightwall" }));
            stage.insert(new Q.Wall({ x: 11, y: 7, wall:"rightwall" }));
            stage.insert(new Q.Wall({ x: 11, y: 8, wall:"rightwall" }));
            stage.insert(new Q.Wall({ x: 11, y: 9, wall:"rightwall" }));
            stage.insert(new Q.Wall({ x: 11, y: 10, wall:"bottomrightcorner" }));
            
            stage.insert(new Q.Wall({ x: 2, y: 10, wall:"bottomwall" }));
            stage.insert(new Q.Wall({ x: 3, y: 10, wall:"bottomwall" }));
            stage.insert(new Q.Wall({ x: 4, y: 10, wall:"bottomwall" }));
            stage.insert(new Q.Wall({ x: 5, y: 10, wall:"bottomwall" }));
            stage.insert(new Q.Wall({ x: 6, y: 10, wall:"bottomwall" }));
            stage.insert(new Q.Wall({ x: 7, y: 10, wall:"bottomwall" }));
            stage.insert(new Q.Wall({ x: 8, y: 10, wall:"bottomwall" }));
            stage.insert(new Q.Wall({ x: 9, y: 10, wall:"bottomwall" }));
            stage.insert(new Q.Wall({ x: 10, y: 10, wall:"bottomwall" }));

            //inside
            
            stage.insert(new Q.Wall({ x: 3, y: 2, wall:"topleftcorner" }));
            stage.insert(new Q.Wall({ x: 3, y: 3, wall:"leftwall" }));
            stage.insert(new Q.Wall({ x: 3, y: 4, wall:"leftwall" }));
            stage.insert(new Q.Wall({ x: 3, y: 5, wall:"leftwall" }));
            stage.insert(new Q.Wall({ x: 3, y: 6, wall:"leftwall" }));
            stage.insert(new Q.Wall({ x: 3, y: 7, wall:"leftwall" }));
            stage.insert(new Q.Wall({ x: 3, y: 8, wall:"bottomleftcorner" }));
            
            
            stage.insert(new Q.Wall({ x: 4, y: 2, wall:"topwall" }));
            stage.insert(new Q.Wall({ x: 5, y: 2, wall:"topwall" }));
            stage.insert(new Q.Wall({ x: 6, y: 2, wall:"topwall" }));
            stage.insert(new Q.Wall({ x: 7, y: 2, wall:"topwall" }));
            //stage.insert(new Q.Wall({ x: 8, y: 2, wall:"topwall" }));

            stage.insert(new Q.Wall({ x: 8, y: 2, wall:"toprightcorner" }));
            stage.insert(new Q.Wall({ x: 8, y: 3, wall:"rightwall" }));
            stage.insert(new Q.Wall({ x: 8, y: 4, wall:"rightwall" }));
            stage.insert(new Q.Wall({ x: 8, y: 5, wall:"rightwall" }));
            stage.insert(new Q.Wall({ x: 8, y: 6, wall:"rightwall" }));
            stage.insert(new Q.Wall({ x: 8, y: 7, wall:"rightwall" }));
            stage.insert(new Q.Wall({ x: 8, y: 8, wall:"bottomrightcorner" }));     
            
            
            stage.insert(new Q.Wall({ x: 4, y: 8, wall:"bottomwall" }));
            stage.insert(new Q.Wall({ x: 5, y: 8, wall:"bottomwall" }));
            stage.insert(new Q.Wall({ x: 6, y: 8, wall:"bottomwall" }));
            stage.insert(new Q.Wall({ x: 7, y: 8, wall:"bottomwall" }));
           // stage.insert(new Q.Wall({ x: 8, y: 8, wall:"bottomwall" }));
            
            
            
            
            //col two
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
Q.load("CarPos1.png",function() {

    Q.stageScene("level1");
   
 });

    });