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
      Q.SPRITE_BULLET = 2;
      Q.SPRITE_ASTEROID = 4;

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

      Q.VectorSprite.extend("Ship", {
        init: function(p) {
          this._super(p, {
            type: Q.SPRITE_NONE,
            collisionMask: Q.SPRITE_ASTEROID,
            w: 10,
            h: 20,
            omega: 0,
            omegaDelta: 700,
            maxOmega: 400,
            acceleration: 2,
            speed: 0,
            resistance: 0.01,
            points: [ [0, -10 ], [ 5, 10 ], [ -5,10 ]],
            bulletSpeed: 500,
            activated: false
          });
          this.add("2d, reposition");

          Q.input.on("fire",this,"fire");

          this.activationObject = new Q.Sprite({ x: Q.width/2, y: Q.height/2, w: 100, h: 100 });
        },

        checkActivation: function() {
          if(!this.stage.search(this.activationObject, Q.SPRITE_ASTEROID)) {
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
            p.vx = p.vx * (1 - p.resistance);
            p.vy = p.vy * (1 - p.resistance);    
               
        },

        draw: function(ctx) {
          if(this.p.activated) { this._super(ctx); }
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


      Q.scene("level1",function(stage) {
        var player = stage.insert(new Q.Ship({ x: Q.width/2, y: Q.height/2}));


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

      Q.stageScene("level1");

    });