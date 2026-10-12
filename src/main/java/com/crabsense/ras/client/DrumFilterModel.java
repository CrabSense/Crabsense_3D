package com.crabsense.ras.client;

import com.crabsense.ras.RasMod;
import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import net.minecraft.client.model.Model;
import net.minecraft.client.model.geom.ModelLayerLocation;
import net.minecraft.client.model.geom.ModelPart;
import net.minecraft.client.model.geom.PartPose;
import net.minecraft.client.model.geom.builders.CubeListBuilder;
import net.minecraft.client.model.geom.builders.LayerDefinition;
import net.minecraft.client.model.geom.builders.MeshDefinition;
import net.minecraft.client.model.geom.builders.PartDefinition;
import net.minecraft.client.renderer.rendertype.RenderTypes;
import net.minecraft.client.renderer.rendertype.RenderType;

/**
 * The rotating drum, as a runtime model.
 *
 * <p>It is deliberately a cube model rather than a mesh: this is the geometry the
 * block model used to carry, lifted out so it can be spun. The numbers mirror
 * {@code tools/bb_build_drum_v2.mjs} - keep the two in step.
 *
 * <p>Minecraft caps a cube's rotation at 45 degrees about a single axis, so the
 * drum is an octagon: four axis-aligned slabs plus the same four rotated 45 degrees
 * around the shared Z axis. Because a regular octagon needs half-side =
 * apothem * tan(22.5 deg), that value is computed rather than typed.
 */
public class DrumFilterModel extends Model<DrumFilterRenderState> {
	public static final ModelLayerLocation LAYER =
		new ModelLayerLocation(RasMod.id("drum_filter"), "main");

	// Model space, 16 units to the block. The drum axis runs along Z through (8, 4.6).
	public static final float CX = 8f, CY = 6.2f, CZ = 8f;
	private static final float APOTHEM = 4.0f, THICK = 0.4f;
	private static final float HALF = (float) (APOTHEM * Math.tan(Math.PI / 8));
	private static final float RING_APOTHEM = 4.35f, RING_THICK = 0.45f;
	private static final float RING_HALF = (float) (RING_APOTHEM * Math.tan(Math.PI / 8));
	private static final float MESH_Z0 = 4.4f, MESH_Z1 = 14.8f;
	private static final float RING_IN_Z0 = 4.4f, RING_IN_Z1 = 5.0f;
	private static final float RING_OUT_Z0 = 14.2f, RING_OUT_Z1 = 14.8f;

	/** Rotated as one unit; its children carry the geometry. */
	public final ModelPart drum;
	/** Perforated screen - drawn cutout so the openings are see-through. */
	public final ModelPart mesh;
	/** Support rings at each end - drawn solid. */
	public final ModelPart rings;

	public DrumFilterModel(ModelPart root) {
		super(root, RenderTypes::entityCutoutNoCull);
		this.drum = root.getChild("drum");
		this.mesh = this.drum.getChild("mesh");
		this.rings = this.drum.getChild("rings");
	}

	public static LayerDefinition createBodyLayer() {
		MeshDefinition mesh = new MeshDefinition();
		PartDefinition root = mesh.getRoot();
		// The pivot sits on the drum axis, so rotating this part spins the drum in
		// place. Child cubes hold pivot-relative coordinates.
		PartDefinition drum = root.addOrReplaceChild("drum", CubeListBuilder.create(),
			PartPose.offset(CX, CY, CZ));
		PartDefinition screen = drum.addOrReplaceChild("mesh", CubeListBuilder.create(), PartPose.ZERO);
		PartDefinition rings = drum.addOrReplaceChild("rings", CubeListBuilder.create(), PartPose.ZERO);

		octagon(screen, MESH_Z0, MESH_Z1, APOTHEM, HALF, THICK, "mesh");
		octagon(rings, RING_IN_Z0, RING_IN_Z1, RING_APOTHEM, RING_HALF, RING_THICK, "ring_in");
		octagon(rings, RING_OUT_Z0, RING_OUT_Z1, RING_APOTHEM, RING_HALF, RING_THICK, "ring_out");

		// A 16x16 sheet is plenty: the mesh texture is a uniform weave, so the box-UV
		// layout does not matter as long as it stays inside the sheet.
		return LayerDefinition.create(mesh, 16, 16);
	}

	/**
	 * Adds the eight faces of an octagonal tube. Each cardinal slab goes in twice:
	 * once flat and once inside a child part rotated 45 degrees about Z, which is
	 * what closes the octagon.
	 */
	private static void octagon(PartDefinition parent, float z0, float z1, float apothem, float half, float thick, String prefix) {
		float dz0 = z0 - CZ, dz1 = z1 - CZ;
		// east / west span [-half, half] in Y; up / down span it in X.
		slab(parent, prefix + "_east", apothem - thick, -half, dz0, apothem, half, dz1);
		slab(parent, prefix + "_west", -apothem, -half, dz0, -apothem + thick, half, dz1);
		slab(parent, prefix + "_up", -half, apothem - thick, dz0, half, apothem, dz1);
		slab(parent, prefix + "_down", -half, -apothem, dz0, half, -apothem + thick, dz1);
	}

	private static void slab(PartDefinition parent, String name, float x0, float y0, float z0, float x1, float y1, float z1) {
		CubeListBuilder cube = CubeListBuilder.create().texOffs(0, 0)
			.addBox(x0, y0, z0, x1 - x0, y1 - y0, z1 - z0);
		parent.addOrReplaceChild(name, cube, PartPose.ZERO);
		parent.addOrReplaceChild(name + "_diag", cube,
			PartPose.rotation(0f, 0f, 45f * (float) Math.PI / 180f));
	}

	/** Renders the two halves; the caller has already applied the spin. */
	public void renderDrum(PoseStack pose, VertexConsumer meshBuffer, VertexConsumer ringBuffer, int light, int overlay) {
		this.mesh.render(pose, meshBuffer, light, overlay);
		this.rings.render(pose, ringBuffer, light, overlay);
	}

	@Override
	public void setupAnim(DrumFilterRenderState state) {
		this.drum.zRot = state.rotation;
	}
}
