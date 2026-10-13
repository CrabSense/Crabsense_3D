package com.crabsense.ras.block;

import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.core.particles.DustParticleOptions;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockState;

/**
 * Drives the drum filter's "running" look. The drum itself is a static block model
 * (see tools/bb_build_drum_v2.mjs); this block entity supplies the motion the model
 * cannot: the backwash spray falling from the five nozzles onto the drum.
 */
public class DrumFilterBlockEntity extends BlockEntity {
	/**
	 * Spray nozzle positions in model units (the same coordinates the model uses),
	 * expressed as a fraction of one block so they line up with the geometry:
	 * x = 8, y = 10.2, z = 4.3, 6.1, 7.9, 9.7, 11.5.
	 */
	private static final double NOZZLE_X = 8.0 / 16.0;
	private static final double NOZZLE_Y = 10.7 / 16.0;
	private static final double[] NOZZLE_Z = { 4.4 / 16.0, 6.2 / 16.0, 8.0 / 16.0, 9.8 / 16.0, 11.6 / 16.0 };

	/** Backwash cycle: 15 seconds running, then 10 seconds stopped. */
	private static final int CYCLE_TICKS = 500;
	private static final int ACTIVE_TICKS = 300;
	private static final DustParticleOptions CLEAN_WATER =
		new DustParticleOptions(0x1F73FF, 0.55F);
	private static final DustParticleOptions DIRTY_WATER =
		new DustParticleOptions(0x4D1F09, 0.65F);

	public DrumFilterBlockEntity(BlockPos pos, BlockState state) {
		super(RasBlockEntities.DRUM_FILTER, pos, state);
	}

	public static void tick(Level level, BlockPos pos, BlockState state, DrumFilterBlockEntity be) {
		if (!(level instanceof ServerLevel server)) {
			return;
		}
		if (level.getGameTime() % CYCLE_TICKS >= ACTIVE_TICKS) {
			return;
		}
		server.sendParticles(CLEAN_WATER, pos.getX() + 2.5 / 16.0, pos.getY() + 5.5 / 16.0, pos.getZ() + 0.62,
			4, 0.05, 0.02, 0.22, 0.0);
		server.sendParticles(CLEAN_WATER, pos.getX() + 13.5 / 16.0, pos.getY() + 5.5 / 16.0, pos.getZ() + 0.62,
			4, 0.05, 0.02, 0.22, 0.0);
		server.sendParticles(DIRTY_WATER, pos.getX() + 0.5, pos.getY() + 9.1 / 16.0, pos.getZ() + 0.45,
			4, 0.06, 0.03, 0.22, 0.01);
		server.sendParticles(ParticleTypes.SPLASH, pos.getX() + 0.55, pos.getY() + 0.42, pos.getZ() + 0.5,
			3, 0.12, 0.02, 0.1, 0.0);
		for (double z : NOZZLE_Z) {
			// A little horizontal spread makes the curtain read as a spray rather
			// than a single drip; speed 0 lets gravity carry the droplets down.
			server.sendParticles(ParticleTypes.SPLASH,
				pos.getX() + NOZZLE_X, pos.getY() + NOZZLE_Y, pos.getZ() + z,
				4, 0.10, 0.08, 0.10, 0.02);
			server.sendParticles(ParticleTypes.DRIPPING_WATER,
				pos.getX() + NOZZLE_X, pos.getY() + NOZZLE_Y - 0.05, pos.getZ() + z,
				3, 0.05, 0.02, 0.05, 0.01);
			server.sendParticles(CLEAN_WATER,
				pos.getX() + NOZZLE_X, pos.getY() + NOZZLE_Y - 0.08, pos.getZ() + z,
				2, 0.07, 0.04, 0.07, 0.03);
		}
		// Top pipe is the waste outlet. The two lower pipes are inlet and outlet.
		server.sendParticles(DIRTY_WATER, pos.getX() + 8.0 / 16.0,
			pos.getY() + 9.4 / 16.0, pos.getZ() - 0.15,
			3, 0.05, 0.04, 0.02, 0.04);
		server.sendParticles(CLEAN_WATER, pos.getX() + 8.0 / 16.0,
			pos.getY() + 2.8 / 16.0, pos.getZ() + 16.15 / 16.0,
			3, 0.06, 0.04, 0.02, 0.04);
	}
}
