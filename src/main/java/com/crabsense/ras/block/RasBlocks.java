package com.crabsense.ras.block;

import com.crabsense.ras.RasMod;
import net.fabricmc.fabric.api.itemgroup.v1.ItemGroupEvents;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.CreativeModeTabs;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.SoundType;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.material.MapColor;

import java.util.List;
import java.util.function.Function;

/**
 * The RAS equipment blocks. Every entry here needs matching assets under
 * {@code assets/crabsense_ras} (blockstate, block model, item model, lang, texture).
 * {@code tools/check_assets.ps1} verifies that wiring.
 */
public final class RasBlocks {
	private RasBlocks() {
	}

	public static final Block TANK = register("tank",
		BlockBehaviour.Properties.of().mapColor(MapColor.COLOR_CYAN).strength(1.0F).sound(SoundType.GLASS));
	public static final Block PUMP = register("pump",
		BlockBehaviour.Properties.of().mapColor(MapColor.METAL).strength(2.0F).sound(SoundType.METAL));
	public static final Block RACK = register("rack",
		BlockBehaviour.Properties.of().mapColor(MapColor.METAL).strength(1.5F).sound(SoundType.METAL));
	public static final Block CRAB_BOX = register("crab_box",
		BlockBehaviour.Properties.of().mapColor(MapColor.COLOR_BLUE).strength(1.0F).sound(SoundType.WOOD).noOcclusion(),
		CrabBoxBlock::new);
	public static final Block DRUM_FILTER = register("drum_filter",
		BlockBehaviour.Properties.of().mapColor(MapColor.METAL).strength(2.0F).sound(SoundType.METAL).noOcclusion().lightLevel(state -> 15),
		DrumFilterBlock::new);
	private static BlockBehaviour.Properties pvcProps() {
		return BlockBehaviour.Properties.of().mapColor(MapColor.COLOR_LIGHT_GRAY).strength(0.8F).sound(SoundType.STONE).noOcclusion();
	}
	public static final Block PVC_TEE = register("pvc_tee", pvcProps(),
		p -> new PvcFittingBlock(PvcFittingBlock.Kind.TEE, p));
	public static final Block PVC_ELBOW = register("pvc_elbow", pvcProps(),
		p -> new PvcFittingBlock(PvcFittingBlock.Kind.ELBOW, p));
	public static final Block PVC_CAP = register("pvc_cap", pvcProps(),
		p -> new PvcFittingBlock(PvcFittingBlock.Kind.CAP, p));
	public static final Block PVC_PIPE = register("pvc_pipe", pvcProps(),
		p -> new PvcFittingBlock(PvcFittingBlock.Kind.PIPE, p));

	public static final List<Block> ALL = List.of(TANK, PUMP, RACK, CRAB_BOX, DRUM_FILTER, PVC_TEE, PVC_ELBOW, PVC_CAP, PVC_PIPE);

	public static void register() {
		ItemGroupEvents.modifyEntriesEvent(CreativeModeTabs.BUILDING_BLOCKS).register(entries -> ALL.forEach(entries::accept));
	}

	private static Block register(String name, BlockBehaviour.Properties properties) {
		return register(name, properties, Block::new);
	}

	private static Block register(String name, BlockBehaviour.Properties properties, Function<BlockBehaviour.Properties, Block> factory) {
		var id = RasMod.id(name);
		// Since 1.21.9 the block/item properties carry their own registry key, and
		// Block's constructor hard-fails with "Block id not set" without it.
		var blockKey = ResourceKey.create(Registries.BLOCK, id);
		Block block = factory.apply(properties.setId(blockKey));
		Registry.register(BuiltInRegistries.BLOCK, id, block);
		var itemKey = ResourceKey.create(Registries.ITEM, id);
		Registry.register(BuiltInRegistries.ITEM, id, new BlockItem(block, new Item.Properties().setId(itemKey)));
		return block;
	}
}
