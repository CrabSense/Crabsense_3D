package com.crabsense.ras.block;

import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.EntityBlock;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.entity.BlockEntityTicker;
import net.minecraft.world.level.block.entity.BlockEntityType;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.block.state.BlockState;

/**
 * The drum filter is an ordinary block that also hosts a block entity, so it ticks
 * its backwash spray. It stays a plain {@link Block} rather than a BaseEntityBlock
 * because it renders from the shared block model and needs none of that class's
 * model plumbing.
 */
public class DrumFilterBlock extends Block implements EntityBlock {
	public DrumFilterBlock(BlockBehaviour.Properties properties) {
		super(properties);
	}

	@Override
	public BlockEntity newBlockEntity(BlockPos pos, BlockState state) {
		return new DrumFilterBlockEntity(pos, state);
	}

	@Override
	public <T extends BlockEntity> BlockEntityTicker<T> getTicker(Level level, BlockState state, BlockEntityType<T> type) {
		// Server side only: ServerLevel broadcasts the particles to clients, and
		// Level.isClientSide is not readable from outside the class in 1.21.11.
		if (!(level instanceof ServerLevel server) || type != RasBlockEntities.DRUM_FILTER) {
			return null;
		}
		return (tickLevel, pos, tickState, blockEntity) ->
			DrumFilterBlockEntity.tick(server, pos, tickState, (DrumFilterBlockEntity) blockEntity);
	}
}
