package com.crabsense.ras.block;

import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.util.RandomSource;
import net.minecraft.world.item.context.BlockPlaceContext;
import net.minecraft.world.level.LevelReader;
import net.minecraft.world.level.ScheduledTickAccess;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.StateDefinition;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;
import net.minecraft.world.level.block.state.properties.BooleanProperty;

/**
 * Crab boxes share drain manifolds: a neighbour on a side opens a through-T,
 * and a free end is an elbow cap. Matches the 2D CAD rack: T along the row,
 * caps on the two ends.
 */
public class CrabBoxBlock extends Block {
	public static final BooleanProperty NORTH = BlockStateProperties.NORTH;
	public static final BooleanProperty SOUTH = BlockStateProperties.SOUTH;
	public static final BooleanProperty EAST = BlockStateProperties.EAST;
	public static final BooleanProperty WEST = BlockStateProperties.WEST;

	public CrabBoxBlock(BlockBehaviour.Properties properties) {
		super(properties);
		this.registerDefaultState(this.stateDefinition.any()
			.setValue(NORTH, false)
			.setValue(SOUTH, false)
			.setValue(EAST, false)
			.setValue(WEST, false));
	}

	@Override
	protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
		builder.add(NORTH, SOUTH, EAST, WEST);
	}

	@Override
	public BlockState getStateForPlacement(BlockPlaceContext context) {
		return connections(this.defaultBlockState(), context.getLevel(), context.getClickedPos());
	}

	@Override
	protected BlockState updateShape(BlockState state, LevelReader level, ScheduledTickAccess ticks,
			BlockPos pos, Direction direction, BlockPos neighborPos, BlockState neighborState, RandomSource random) {
		BooleanProperty side = sideProperty(direction);
		if (side == null) {
			return state;
		}
		return state.setValue(side, neighborState.is(this));
	}

	static BooleanProperty sideProperty(Direction direction) {
		return switch (direction) {
			case NORTH -> NORTH;
			case SOUTH -> SOUTH;
			case EAST -> EAST;
			case WEST -> WEST;
			default -> null;
		};
	}

	static BlockState connections(BlockState state, LevelReader level, BlockPos pos) {
		Block self = state.getBlock();
		return state
			.setValue(NORTH, level.getBlockState(pos.north()).is(self))
			.setValue(SOUTH, level.getBlockState(pos.south()).is(self))
			.setValue(EAST, level.getBlockState(pos.east()).is(self))
			.setValue(WEST, level.getBlockState(pos.west()).is(self));
	}
}
