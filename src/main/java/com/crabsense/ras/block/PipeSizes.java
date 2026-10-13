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

	static final double BOX_BOTTOM_X = 14.0;
	static final double BOX_BOTTOM_Z = 8.0;
	static final double BOX_SURFACE_X = 8.0;
	static final double BOX_SURFACE_Z = 13.15;

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
		if (block == RasBlocks.DRUM_FILTER) {
			return PipeSize.DN60;
		}
		if (block == RasBlocks.BLUE_WATER_DRUM_SIDE_OUTLET) {
			return PipeSize.DN34;
		}
		if (block == RasBlocks.CRAB_BOX) {
			return crabBoxDrain(pos, click, onFace);
		}
		return null;
	}

	/** Surface drain DN27 sits nearer south; bottom drain DN34 sits nearer east. */
	static PipeSize crabBoxDrain(BlockPos box, Vec3 click, Direction onFace) {
		double lx = (click.x - box.getX()) * 16;
		double lz = (click.z - box.getZ()) * 16;
		double d34 = onFace.getAxis() == Direction.Axis.Z
			? Math.abs(lx - BOX_BOTTOM_X)
			: Math.abs(lz - BOX_BOTTOM_Z);
		double d27 = onFace.getAxis() == Direction.Axis.Z
			? Math.abs(lx - BOX_SURFACE_X)
			: Math.abs(lz - BOX_SURFACE_Z);
		if (onFace.getAxis() == Direction.Axis.Y) {
			d34 = hypot(lx - BOX_BOTTOM_X, lz - BOX_BOTTOM_Z);
			d27 = hypot(lx - BOX_SURFACE_X, lz - BOX_SURFACE_Z);
		}
		return d34 <= d27 ? PipeSize.DN34 : PipeSize.DN27;
	}

	private static double hypot(double x, double z) {
		return Math.sqrt(x * x + z * z);
	}
}
