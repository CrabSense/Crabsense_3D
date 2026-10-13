package com.crabsense.ras.block;

import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.EntityBlock;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.entity.BlockEntityTicker;
import net.minecraft.world.level.block.entity.BlockEntityType;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.BlockHitResult;

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
	protected InteractionResult useItemOn(ItemStack stack, BlockState state, Level level, BlockPos pos,
			Player player, InteractionHand hand, BlockHitResult hit) {
		if (!(stack.getItem() instanceof BlockItem item) || !(item.getBlock() instanceof PvcFittingBlock)) {
			return InteractionResult.PASS;
		}
		Direction face = hit.getDirection();
		if (face != Direction.NORTH) {
			return InteractionResult.PASS;
		}
		BlockState pipe = level.getBlockState(pos.relative(face));
		if (!(pipe.getBlock() instanceof PvcFittingBlock)) {
			return InteractionResult.PASS;
		}
		PipeMount cur = pipe.getValue(PvcFittingBlock.MOUNT);
		double ly = (hit.getLocation().y - pos.getY()) * 16.0;
		PipeMount next = ly >= 6.0
			? (cur == PipeMount.DRUM ? PipeMount.DRUM_BOTH : cur)
			: (cur == PipeMount.DRUM_HIGH ? PipeMount.DRUM_BOTH : cur);
		if (next == cur) {
			return InteractionResult.PASS;
		}
		if (!level.isClientSide()) {
			PvcFittingBlock held = (PvcFittingBlock) item.getBlock();
			BlockState updated;
			if (cur == PipeMount.DRUM) {
				updated = pipe.setValue(PvcFittingBlock.MOUNT, PipeMount.DRUM_BOTH)
					.setValue(PvcFittingBlock.HIGH_FACING, Direction.SOUTH)
					.setValue(PvcFittingBlock.HIGH_BEND, PipeBend.LEFT)
					.setValue(PvcFittingBlock.HIGH_KIND, held.kind());
			} else {
				PvcFittingBlock existed = (PvcFittingBlock) pipe.getBlock();
				updated = held.defaultBlockState()
					.setValue(PvcFittingBlock.MOUNT, PipeMount.DRUM_BOTH)
					.setValue(PvcFittingBlock.DN, pipe.getValue(PvcFittingBlock.DN))
					.setValue(PvcFittingBlock.FACING, Direction.SOUTH)
					.setValue(PvcFittingBlock.BEND, PipeBend.LEFT)
					.setValue(PvcFittingBlock.HIGH_FACING, pipe.getValue(PvcFittingBlock.FACING))
					.setValue(PvcFittingBlock.HIGH_BEND, pipe.getValue(PvcFittingBlock.BEND))
					.setValue(PvcFittingBlock.HIGH_KIND, existed.kind());
			}
			level.setBlock(pos.relative(face), updated, 3);
		}
		return InteractionResult.SUCCESS;
	}

	@Override
	public <T extends BlockEntity> BlockEntityTicker<T> getTicker(Level level, BlockState state, BlockEntityType<T> type) {
		// Server side only: ServerLevel broadcasts the particles to clients, and
		// Level.isClientSide is not readable from outside the class in 1.21.11.
		if (!(level instanceof ServerLevel server) || type != RasBlockEntities.DRUM_FILTER) {
			return null;
		}
		return (tickLevel, tickPos, tickState, blockEntity) ->
			DrumFilterBlockEntity.tick(server, tickPos, tickState, (DrumFilterBlockEntity) blockEntity);
	}
}
