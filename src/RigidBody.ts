import * as gfx from 'gophergfx'

export class RigidBody extends gfx.Mesh3
{
    // Parameter to approximate downward acceleration due to gravity
    public static gravity = -10;

    // The current velocity of the rigid body
    public velocity: gfx.Vector3;

    // The current radius of the rigid body's collision sphere
    private radius: number;

    constructor(baseMesh: gfx.Mesh3)
    {   
        super();

        // Copy over all the mesh data from the base mesh
        this.positionBuffer = baseMesh.positionBuffer;
        this.normalBuffer = baseMesh.normalBuffer;
        this.colorBuffer = baseMesh.colorBuffer;
        this.indexBuffer = baseMesh.indexBuffer;
        this.texCoordBuffer = baseMesh.texCoordBuffer;
        this.vertexCount = baseMesh.vertexCount;
        this.hasVertexColors = baseMesh.hasVertexColors;
        this.triangleCount = baseMesh.triangleCount;
        this.material = baseMesh.material;
        this.boundingBox = baseMesh.boundingBox;
        this.boundingSphere = baseMesh.boundingSphere;
        this.visible = baseMesh.visible;

        this.velocity = new gfx.Vector3();
        this.radius = baseMesh.boundingSphere.radius;
    }

    update(deltaTime: number): void
    {

        const a = new gfx.Vector3(0, RigidBody.gravity, 0);

        this.velocity.y += a.y * deltaTime;

        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.position.z += this.velocity.z * deltaTime;
    }

    setRadius(radius: number): void
    {
        this.radius = radius;
        
        const scaleFactor = this.radius / this.boundingSphere.radius;
        this.scale.set(scaleFactor, scaleFactor, scaleFactor);
    }
    getRadius(): number
    {
        return this.radius;
    }
}