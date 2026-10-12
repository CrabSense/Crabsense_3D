package com.crabsense.ras.client;

import com.crabsense.ras.block.DrumFilterBlockEntity;
import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.renderer.SubmitNodeCollector;
import net.minecraft.client.renderer.blockentity.state.BlockEntityRenderState;
import net.minecraft.client.renderer.state.CameraRenderState;
import net.minecraft.client.renderer.blockentity.BlockEntityRenderer;
import net.minecraft.client.renderer.blockentity.BlockEntityRendererProvider;

/**
 * Kept registered so the block entity still ticks spray. The drum mesh itself lives
 * in the block model; its motion is the scrolling {@code drum_mesh.png} animation.
 */
public class DrumFilterRenderer implements BlockEntityRenderer<DrumFilterBlockEntity, DrumFilterRenderState> {
	public DrumFilterRenderer(BlockEntityRendererProvider.Context context) {
	}

	@Override
	public DrumFilterRenderState createRenderState() {
		return new DrumFilterRenderState();
	}

	@Override
	public void extractRenderState(DrumFilterBlockEntity blockEntity, DrumFilterRenderState state,
			float partialTick, net.minecraft.world.phys.Vec3 camera, net.minecraft.client.renderer.feature.ModelFeatureRenderer.CrumblingOverlay crumbling) {
		BlockEntityRenderState.extractBase(blockEntity, state, crumbling);
	}

	@Override
	public void submit(DrumFilterRenderState state, PoseStack pose,
			SubmitNodeCollector collector, CameraRenderState camera) {
	}
}
