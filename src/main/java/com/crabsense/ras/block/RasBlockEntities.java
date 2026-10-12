package com.crabsense.ras.block;

import com.crabsense.ras.RasMod;
import net.fabricmc.fabric.api.object.builder.v1.block.entity.FabricBlockEntityTypeBuilder;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.world.level.block.entity.BlockEntityType;

/** Block entities that need per-tick behaviour. */
public final class RasBlockEntities {
	private RasBlockEntities() {
	}

	/**
	 * Registered after {@link RasBlocks} because the type holds a reference to the
	 * drum filter block. Touching this class triggers RasBlocks' static init first,
	 * so DRUM_FILTER is already set when it is read here.
	 *
	 * <p>Built through Fabric's builder: since 1.21.9 BlockEntityType's constructor
	 * and its vanilla {@code register} helper are both private and the old
	 * {@code BlockEntityType.Builder} no longer exists, so Fabric API is the only
	 * way for a mod to create one.
	 */
	public static final BlockEntityType<DrumFilterBlockEntity> DRUM_FILTER =
		Registry.register(BuiltInRegistries.BLOCK_ENTITY_TYPE, RasMod.id("drum_filter"),
			FabricBlockEntityTypeBuilder.create(DrumFilterBlockEntity::new, RasBlocks.DRUM_FILTER).build());

	public static void register() {
		RasMod.LOGGER.info("[CrabSense RAS] registered block entity {}", RasMod.id("drum_filter"));
	}
}
