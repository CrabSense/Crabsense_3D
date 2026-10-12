package com.crabsense.ras.client;

import com.crabsense.ras.block.RasBlockEntities;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.rendering.v1.EntityModelLayerRegistry;
import net.minecraft.client.renderer.blockentity.BlockEntityRenderers;

/** Client-only wiring: the drum model layer and its renderer. */
public class RasModClient implements ClientModInitializer {
	@Override
	public void onInitializeClient() {
		EntityModelLayerRegistry.registerModelLayer(DrumFilterModel.LAYER, DrumFilterModel::createBodyLayer);
		BlockEntityRenderers.register(RasBlockEntities.DRUM_FILTER, DrumFilterRenderer::new);
	}
}
