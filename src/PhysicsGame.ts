import * as gfx from 'gophergfx'
import { RigidBody } from './RigidBody';

export class PhysicsGame extends gfx.GfxApp
{
    // State variable to store the current stage of the game
    private stage: number;

    // Current hole radius
    private holeRadius: number;

    // Mesh of a ground plane with a hole in it
    private hole: gfx.Mesh3;

    // Template mesh to create sphere instances
    private sphere: gfx.Mesh3;

    // Bounding box that defines the dimensions of the play area
    private playArea: gfx.BoundingBox3;

    // Group that will hold all the rigid bodies currently in the scene
    private rigidBodies: gfx.Node3;  

    // A plane mesh that will be used to display dynamic text
    private textPlane: gfx.Mesh3;

    // A dynamic texture that will be displayed on the plane mesh
    private text: gfx.Text;

    // A sound effect to play when an object falls inside the hole
    private holeSound: HTMLAudioElement;

    // A sound effect to play when the user wins the game
    private winSound: HTMLAudioElement;

    // Vector used to store user input from keyboard or mouse
    private inputVector: gfx.Vector2;

    constructor()
    {
        super();

        this.stage = 0;

        this.holeRadius = 1;
        this.hole = gfx.MeshLoader.loadOBJ('./assets/hole.obj');
        this.sphere = gfx.Geometry3Factory.createSphere(1, 2);

        this.playArea = new gfx.BoundingBox3();
        this.rigidBodies = new gfx.Node3();
        
        this.textPlane = gfx.Geometry3Factory.createPlane();
        this.text = new gfx.Text('press a button to start', 512, 256, '48px Helvetica');
        this.holeSound = new Audio('./assets/hole.mp3');
        this.winSound = new Audio('./assets/win.mp3');

        this.inputVector = new gfx.Vector2();
    }

    createScene(): void 
    {
        // Setup the camera projection matrix, position, and look direction.
        // We will learn more about camera models later in this course.
        this.camera.setPerspectiveCamera(60, 1920/1080, 0.1, 50)
        this.camera.position.set(0, 12, 12);
        this.camera.lookAt(gfx.Vector3.ZERO);

        // Create an ambient light that illuminates everything in the scene
        const ambientLight = new gfx.AmbientLight(new gfx.Color(0.3, 0.3, 0.3));
        this.scene.add(ambientLight);

        // Create a directional light that is infinitely far away (sunlight)
        const directionalLight = new gfx.DirectionalLight(new gfx.Color(0.6, 0.6, 0.6));
        directionalLight.position.set(0, 2, 1);
        this.scene.add(directionalLight);

        // Set the hole mesh material color to green
        this.hole.material.setColor(new gfx.Color(83/255, 209/255, 110/255));

        // Create a bounding box for the game
        this.playArea.min.set(-10, 0, -16);
        this.playArea.max.set(10, 30, 8);   

        // Position the text plane mesh on the ground
        this.textPlane.position.set(0, 0.1, 4.5);
        this.textPlane.scale.set(16, 8, 1);
        this.textPlane.rotation.setEulerAngles(-Math.PI/2, 0, Math.PI);

        // Set up the dynamic texture for the text plane
        const textMaterial = new gfx.UnlitMaterial();
        textMaterial.texture = this.text;
        this.textPlane.material = textMaterial;

        // Draw lines for the bounding box
        const playBounds = new gfx.Line3();
        playBounds.createFromBox(this.playArea);
        playBounds.color.set(1, 1, 1);
        this.scene.add(playBounds);

        // Add the objects to the scene
        this.scene.add(this.hole);
        this.scene.add(this.textPlane);
        this.scene.add(this.rigidBodies);
    }

    update(deltaTime: number): void 
    {

        // The movement speed of the hole in meters / sec
        const holeSpeed = 10;

        // The friction constant will cause physics objects to slow down upon collision
        const frictionSlowDown = 0.9;

        // Hole radius scale factor
        const holeScaleFactor = 1.25;

        // Move hole based on the user input
        this.hole.position.x += this.inputVector.x * holeSpeed * deltaTime;
        this.hole.position.z -= this.inputVector.y * holeSpeed * deltaTime;



        //=========================================================================
        const minX = this.playArea.min.x + this.holeRadius;
        const maxX = this.playArea.max.x - this.holeRadius;
        const minZ = this.playArea.min.z + this.holeRadius;
        const maxZ = this.playArea.max.z - this.holeRadius;


        if (this.hole.position.x < minX) {
            this.hole.position.x = minX;
        }
        if (this.hole.position.x > maxX) {
            this.hole.position.x = maxX;
        }
        
        if (this.hole.position.z < minZ) {
            this.hole.position.z = minZ;
        }
        if (this.hole.position.z > maxZ) {
            this.hole.position.z = maxZ;
        }

        //=========================================================================


        // Update rigid body physics
        // You do not need to modify this code
        this.rigidBodies.children.forEach((transform: gfx.Node3) => {
            const rb = transform as RigidBody;
            rb.update(deltaTime);
        });

        // Handle object-object collisions
        // You do not need to modify this code
        for(let i=0; i < this.rigidBodies.children.length; i++)
        {
            for(let j=i+1; j < this.rigidBodies.children.length; j++)
            {
                const rb1 = this.rigidBodies.children[i] as RigidBody;
                const rb2 = this.rigidBodies.children[j] as RigidBody;

                this.handleObjectCollision(rb1, rb2, frictionSlowDown)
            }
        }

        // Handle object-environment collisions
        // You do not need to modify this code
        this.rigidBodies.children.forEach((transform: gfx.Node3) => {
            const rb = transform as RigidBody;

            // The object has fallen far enough to score a point
            if(rb.position.y < -10)
            {
                this.holeSound.play(); 

                // Remove the object from the scene
                rb.remove();

                //Check if we captured the last sphere
                if(this.rigidBodies.children.length == 0)
                    this.startNextStage();
                else
                    this.setHoleRadius(this.holeRadius * holeScaleFactor);
            }
            // The object is within range of the hole and can fit inside
            else if(rb.getRadius() < this.holeRadius && rb.position.distanceTo(this.hole.position) < this.holeRadius)
            {
                this.handleRimCollision(rb, frictionSlowDown);
            }
            // The object has not fallen all the way into the hole yet
            else if(rb.position.y + rb.getRadius() > 0)
            {
                this.handleBoundaryCollision(rb, frictionSlowDown);
            }
            
        });
    }

    handleBoundaryCollision(rb: RigidBody, frictionSlowDown: number): void
    {
        const minY = this.playArea.min.y + rb.getRadius();
        const maxY = this.playArea.max.y - rb.getRadius();
        const minX = this.playArea.min.x + rb.getRadius();
        const maxX = this.playArea.max.x - rb.getRadius();
        const minZ = this.playArea.min.z + rb.getRadius();
        const maxZ = this.playArea.max.z - rb.getRadius();
        if (rb.position.y < minY) {
            rb.position.y = minY;
            rb.velocity.y *= -1;
            rb.velocity.multiplyScalar(frictionSlowDown);
        }
        if (rb.position.y > maxY) {
            rb.position.y = maxY;
            rb.velocity.y *= -1;
            rb.velocity.multiplyScalar(frictionSlowDown);
        }
        if (rb.position.x < minX) {
            rb.position.x = minX;
            rb.velocity.x *= -1;
            rb.velocity.multiplyScalar(frictionSlowDown);
        }
        if (rb.position.x > maxX) {
            rb.position.x = maxX;
            rb.velocity.x *= -1;
            rb.velocity.multiplyScalar(frictionSlowDown);
        }
        if (rb.position.z < minZ) {
            rb.position.z = minZ;
            rb.velocity.z *= -1;
            rb.velocity.multiplyScalar(frictionSlowDown);
        }
        if (rb.position.z > maxZ) {
            rb.position.z = maxZ;
            rb.velocity.z *= -1;
            rb.velocity.multiplyScalar(frictionSlowDown);
        }
    }

    handleObjectCollision(rb1: RigidBody, rb2: RigidBody, frictionSlowDown: number): void
    {

        const rbdistance = rb1.position.distanceTo(rb2.position);
        const totalRadius = rb1.getRadius() + rb2.getRadius();
        if (rb1.getRadius() + rb2.getRadius() > rbdistance) {
            const vrel1 = gfx.Vector3.subtract(rb1.velocity, rb2.velocity);
            const vrel2 = gfx.Vector3.subtract(rb2.velocity, rb1.velocity);

            const norm1 = gfx.Vector3.subtract(rb1.position, rb2.position);
            const norm1p = gfx.Vector3.normalize(norm1);

            const norm2 = gfx.Vector3.subtract(rb2.position, rb1.position);
            const norm2p = gfx.Vector3.normalize(norm2);

            const separationDistance = totalRadius - rbdistance;
            const correctionVector1 = gfx.Vector3.multiplyScalar(norm1p, separationDistance);
            const correctionVector2 = gfx.Vector3.multiplyScalar(norm2p, separationDistance);

            rb1.position.add(correctionVector1);
            rb2.position.add(correctionVector2);

            rb1.velocity = gfx.Vector3.reflect(vrel1, norm1p);
            rb2.velocity = gfx.Vector3.reflect(vrel2, norm2p);


            rb1.velocity.multiplyScalar(frictionSlowDown * 0.5);
            rb2.velocity.multiplyScalar(frictionSlowDown * 0.5);
        }
    }

    handleRimCollision(rb: RigidBody, frictionSlowDown: number): void
    {
        // Compute the rigid body's position, ignoring any vertical displacement
        const rbOnGround = new gfx.Vector3(rb.position.x, 0, rb.position.z);

        // Find the closest point along the rim of the hole
        const rimPoint = gfx.Vector3.subtract(rbOnGround, this.hole.position);
        rimPoint.normalize();
        rimPoint.multiplyScalar(this.holeRadius);
        rimPoint.add(this.hole.position.clone());

        // If the rigid body is colliding with the point on the rim
        if(rb.position.distanceTo(rimPoint) < rb.getRadius())
        {
            // Correct the position of the rigid body so that it is no longer intersecting
            const correctionDistance = rb.getRadius() - rb.position.distanceTo(rimPoint) ;
            const correctionMovement = gfx.Vector3.subtract(rb.position, rimPoint);
            correctionMovement.normalize();
            correctionMovement.multiplyScalar(correctionDistance);
            rb.position.add(correctionMovement);

            // Compute the collision normal
            const rimNormal = gfx.Vector3.subtract(this.hole.position, rimPoint);
            rimNormal.normalize();

            // Reflect the velocity about the collision normal
            rb.velocity.reflect(rimNormal);

            // Slow down the velocity due to friction
            rb.velocity.multiplyScalar(frictionSlowDown);
        }
    }

    // This method advances to the next stage of the game
    startNextStage(): void
    {
        // Create a test scene when the user presses start
        if(this.stage == 0)
        {
            this.textPlane.visible = false;
            
            const rb1 = new RigidBody(this.sphere);
            rb1.material = new gfx.GouraudMaterial();
            rb1.material.setColor(gfx.Color.RED);
            rb1.position.set(0, 0.25, 7.5);
            rb1.setRadius(0.25);
            rb1.velocity.set(0, 10, -4);
            this.rigidBodies.add(rb1);
    
            const rb2 = new RigidBody(this.sphere);
            rb2.material = new gfx.GouraudMaterial();
            rb2.material.setColor(gfx.Color.GREEN);
            rb2.position.set(-8, 1, -5);
            rb2.setRadius(0.5);
            rb2.velocity.set(4, 0, 0);
            this.rigidBodies.add(rb2);
    
            const rb3 = new RigidBody(this.sphere);
            rb3.material = new gfx.GouraudMaterial();
            rb3.material.setColor(gfx.Color.BLUE);
            rb3.position.set(8, 1, -4.5);
            rb3.setRadius(0.5);
            rb3.velocity.set(-9, 0, 0);
            this.rigidBodies.add(rb3);
    
            const rb4 = new RigidBody(this.sphere);
            rb4.material = new gfx.GouraudMaterial();
            rb4.material.setColor(gfx.Color.YELLOW);
            rb4.position.set(0, 0.25, -12);
            rb4.setRadius(0.5);
            rb4.velocity.set(15, 10, -20);
            this.rigidBodies.add(rb4);
        }
        // The user has finished the test scene
        else if(this.stage == 1)
        {
            this.setHoleRadius(0.5);
            // const rb5 = new RigidBody(this.sphere);
            // rb5.material = new gfx.GouraudMaterial();
            // rb5.material.setColor(gfx.Color.PURPLE);
            // rb5.position.set(0.6, 1.5, 3);
            // rb5.setRadius(0.25);
            // rb5.velocity.set(0, -1, -1);
            // this.rigidBodies.add(rb5);

            // const rb6 = new RigidBody(this.sphere);
            // rb6.material = new gfx.GouraudMaterial();
            // rb6.material.setColor(gfx.Color.RED);
            // rb6.position.set(3, 4, -5);
            // rb6.setRadius(0.3);
            // rb6.velocity.set(-3, 7, 4);
            // this.rigidBodies.add(rb6);

            // const rb7 = new RigidBody(this.sphere);
            // rb7.material = new gfx.GouraudMaterial();
            // rb7.material.setColor(gfx.Color.GREEN);
            // rb7.position.set(-6, 15, 6);
            // rb7.setRadius(0.35);
            // rb7.velocity.set(7, 4, -2);
            // this.rigidBodies.add(rb7);

            // const rb8 = new RigidBody(this.sphere);
            // rb8.material = new gfx.GouraudMaterial();
            // rb8.material.setColor(gfx.Color.BLUE);
            // rb8.position.set(0, 9, 0);
            // rb8.setRadius(0.4);
            // rb8.velocity.set(-2, -1, 4);
            // this.rigidBodies.add(rb8);

            // const rb9 = new RigidBody(this.sphere);
            // rb9.material = new gfx.GouraudMaterial();
            // rb9.material.setColor(gfx.Color.YELLOW);
            // rb9.position.set(-8, 3, -6);
            // rb9.setRadius(0.45);
            // rb9.velocity.set(-1, 7, 3);
            // this.rigidBodies.add(rb9);

            // const rb10 = new RigidBody(this.sphere);
            // rb10.material = new gfx.GouraudMaterial();
            // rb10.material.setColor(gfx.Color.BLACK);
            // rb10.position.set(-1, 0.9, 3);
            // rb10.setRadius(0.5);
            // rb10.velocity.set(1, 2, -5);
            // this.rigidBodies.add(rb10);

            // const rb11 = new RigidBody(this.sphere);
            // rb11.material = new gfx.GouraudMaterial();
            // rb11.material.setColor(gfx.Color.WHITE);
            // rb11.position.set(0, 3, 0);
            // rb11.setRadius(0.55);
            // rb11.velocity.set(-4, 0, -3);
            // this.rigidBodies.add(rb11);

            // const rb12 = new RigidBody(this.sphere);
            // rb12.material = new gfx.GouraudMaterial();
            // rb12.material.setColor(gfx.Color.CYAN);
            // rb12.position.set(0.6, 1, 3);
            // rb12.setRadius(0.6);
            // rb12.velocity.set(0, 0, 0);
            // this.rigidBodies.add(rb12);
            let radius = 0.25;
            for (let i = 8; i >= 1; i--) {
                const rbi = new RigidBody(this.sphere);
                const r = Math.random() * (1 - 0) + 0;
                const g = Math.random() * (1 - 0) + 0;
                const b = Math.random() * (1 - 0) + 0;
                const color = new gfx.Color(r, g, b);
                rbi.material = new gfx.GouraudMaterial();
                rbi.material.setColor(color);
                const x = Math.random() * (10 - (-10)) - 10;
                const y = Math.random() * (30 - (0)) + 0;
                const z = Math.random() * (8 - (-16)) - 16;
                rbi.position.set(x, y, z);
                const vx = Math.random() * (10 - (-10)) - 10;
                const vy = Math.random() * (10 - (-10)) - 10;
                const vz = Math.random() * (10 - (-10)) - 10;
                rbi.velocity.set(vx, vy, vz);
                this.rigidBodies.add(rbi);
                rbi.setRadius(radius);
                radius += 0.05; 
            }

        }
        // The user has finished the game
        else
        {
            this.text.text = 'YOU WIN!';
            this.text.updateTextureImage();
            this.textPlane.visible = true;
            this.winSound.play();
        }

        this.stage++;
    }

    // Set the radius of the hole and update the scale of the
    // hole mesh so that it is displayed at the correct size.
    setHoleRadius(radius: number): void
    {
        this.holeRadius = radius;
        this.hole.scale.set(radius, 1, radius);
    }

    // Set the x or y components of the input vector when either
    // the WASD or arrow keys are pressed.
    onKeyDown(event: KeyboardEvent): void 
    {
        if(event.key == 'w' || event.key == 'ArrowUp')
            this.inputVector.y = 1;
        else if(event.key == 's' || event.key == 'ArrowDown')
            this.inputVector.y = -1;
        else if(event.key == 'a' || event.key == 'ArrowLeft')
            this.inputVector.x = -1;
        else if(event.key == 'd' || event.key == 'ArrowRight')
            this.inputVector.x = 1;
    }

    // Reset the x or y components of the input vector when either
    // the WASD or arrow keys are released.
    onKeyUp(event: KeyboardEvent): void 
    {
        if((event.key == 'w' || event.key == 'ArrowUp') && this.inputVector.y == 1)
            this.inputVector.y = 0;
        else if((event.key == 's' || event.key == 'ArrowDown') && this.inputVector.y == -1)
            this.inputVector.y = 0;
        else if((event.key == 'a' || event.key == 'ArrowLeft')  && this.inputVector.x == -1)
            this.inputVector.x = 0;
        else if((event.key == 'd' || event.key == 'ArrowRight')  && this.inputVector.x == 1)
            this.inputVector.x = 0;
    }

    // These mouse events are not necessary to play the game on a computer. However, they
    // are included so that the game is playable on touch screen devices without a keyboard.
    onMouseMove(event: MouseEvent): void 
    {
        // Only update the mouse position if only the left button is currently pressed down
        if(event.buttons == 1)
        {
            const mouseCoordinates = this.getNormalizedDeviceCoordinates(event.x, event.y);

            if(mouseCoordinates.x < -0.5)
                this.inputVector.x = -1;
            else if(mouseCoordinates.x > 0.5)
                this.inputVector.x = 1;

            if(mouseCoordinates.y < -0.5)
                this.inputVector.y = -1;
            else if(mouseCoordinates.y > 0.5)
                this.inputVector.y = 1;
        }
    }

    onMouseUp(event: MouseEvent): void
    {
        // Left mouse button
        if(event.button == 0)
            this.inputVector.set(0, 0);
    }

    onMouseDown(event: MouseEvent): void 
    {
        if(this.stage==0)
            this.startNextStage();
        else
            this.onMouseMove(event);
    }

}
