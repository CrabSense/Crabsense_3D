package com.crabsense.ras.block;

import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.world.level.LevelReader;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.Vec3;

/** Picks DN from the pipe the fitting is being attached to. */
public final class PipeSizes {
	private PipeSizes() {
	}

	public static PipeSize fromNeighbors(LevelReader level, BlockPos place, Vec3 click) {
		PipeSize found = null;
		for (Direction dir : Direction.values()) {
			BlockPos npos = place.relative(dir);
			PipeSize size = of(level.getBlockState(npos), npos, click, dir.getOpposite());
			if (size == null) {
				continue;
			}
			if (found == null || size.mm() > found.mm()) {
				found = size;
			}
		}
		return found == null ? PipeSize.DN34 : found;
	}

	static PipeSize of(BlockState state, BlockPos pos, Vec3 click, Direction onFace) {
		Block block = state.getBlock();
		if (block instanceof PvcFittingBlock) {
			return state.getValue(PvcFittingBlock.DN);
		}
		if (block == RasBlocks.DRUM_FILTER
				|| block == RasBlocks.BLUE_WATER_DRUM
				|| block == RasBlocks.BLUE_WATER_DRUM_SIDE_OUTLET) {
			return PipeSize.DN60;
		}
		if (block == RasBlocks.CRAB_BOX) {
			return crabBoxDrain(pos, click, onFace);
		}
		return null;
	}

	/** Spray/inlet is DN27 up on the wall; both bottom drain lines are DN34. */
	static PipeSize crabBoxDrain(BlockPos box, Vec3 click, Direction onFace) {
		double ly = (click.y - box.getY()) * 16;
		return ly >= 5.5 ? PipeSize.DN27 : PipeSize.DN34;
	}
}
