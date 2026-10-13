package com.crabsense.ras.block;

import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.util.RandomSource;
import net.minecraft.world.item.context.BlockPlaceContext;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.ItemStack;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.LevelReader;
import net.minecraft.world.level.ScheduledTickAccess;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.StateDefinition;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;
import net.minecraft.world.level.block.state.properties.BooleanProperty;
import net.minecraft.world.level.block.state.properties.IntegerProperty;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.Shapes;
import net.minecraft.world.phys.shapes.VoxelShape;
import net.minecraft.world.phys.BlockHitResult;
import java.util.HashMap;
import java.util.Map;

/**
 * Crab boxes share drain manifolds: a neighbour on a side opens a through-T,
 * and a free end is an elbow cap. Matches the 2D CAD rack: T along the row,
 * caps on the two ends.
 */
public class CrabBoxBlock extends Block {
	private static final double SPRAY_X = 2.4 / 16.0;
	private static final double SPRAY_Y = 7.1 / 16.0;
	private static final double SPRAY_Z = 8.0 / 16.0;
	public static final BooleanProperty NORTH = BlockStateProperties.NORTH;
	public static final BooleanProperty SOUTH = BlockStateProperties.SOUTH;
	public static final BooleanProperty EAST = BlockStateProperties.EAST;
	public static final BooleanProperty WEST = BlockStateProperties.WEST;
	public static final BooleanProperty UP = BlockStateProperties.UP;
	/** 0 = nothing below, 1 = one box below, 2 = two boxes below. Draws the vertical T down to that tier. */
	public static final IntegerProperty JOIN = IntegerProperty.create("join", 0, 2);
	/** 1 = bottom half of the block, 2 = both halves. The next tier starts the block above. */
	public static final IntegerProperty LAYERS = IntegerProperty.create("layers", 1, 2);
	public static final BooleanProperty OPEN = BooleanProperty.create("open");
	public static final BooleanProperty OPEN_LOW = BooleanProperty.create("open_low");
	public static final BooleanProperty OPEN_HIGH = BooleanProperty.create("open_high");
	private static final Map<BlockPos, Long> STACK_CLICKS = new HashMap<>();
	private static final Map<BlockPos, Integer> STACK_COUNTS = new HashMap<>();

	public CrabBoxBlock(BlockBehaviour.Properties properties) {
		super(properties);
		this.registerDefaultState(this.stateDefinition.any()
			.setValue(NORTH, false)
			.setValue(SOUTH, false)
			.setValue(EAST, false)
			.setValue(WEST, false)
			.setValue(UP, false)
			.setValue(JOIN, 0)
			.setValue(LAYERS, 1)
			.setValue(OPEN, false)
			.setValue(OPEN_LOW, false)
			.setValue(OPEN_HIGH, false));
	}

	@Override
	public void animateTick(BlockState state, Level level, BlockPos pos, RandomSource random) {
		double x = pos.getX() + SPRAY_X;
		double z = pos.getZ() + SPRAY_Z;
		// Each half-box gets its own short water column; never carry particles through the floor.
		for (int layer = 0; layer < state.getValue(LAYERS); layer++) {
			double baseY = pos.getY() + layer * 0.5;
			for (int i = 0; i < 3; i++) {
				double y = baseY + 0.075 + random.nextDouble() * (0.44 - 0.075);
				level.addParticle(ParticleTypes.RAIN,
					x + (random.nextDouble() - 0.5) * 0.025, y,
					z + (random.nextDouble() - 0.5) * 0.025, 0.0, 0.0, 0.0);
			}
		}
	}

	@Override
	protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
		builder.add(NORTH, SOUTH, EAST, WEST, UP, JOIN, LAYERS, OPEN, OPEN_LOW, OPEN_HIGH);
	}

	@Override
	protected InteractionResult useWithoutItem(BlockState state, Level level, BlockPos pos, Player player, BlockHitResult hit) {
		return toggleDoor(state, level, pos, hit);
	}

	@Override
	protected InteractionResult useItemOn(ItemStack stack, BlockState state, Level level, BlockPos pos,
			Player player, InteractionHand hand, BlockHitResult hit) {
		// Top face remains the stacking/placement surface when the player holds another box.
		if (stack.is(this.asItem()) && hit.getDirection() == Direction.UP) {
			if (!level.isClientSide()) {
				long now = level.getGameTime();
				long previous = STACK_CLICKS.getOrDefault(pos, Long.MIN_VALUE);
				int count = now - previous <= 80 ? STACK_COUNTS.getOrDefault(pos, 0) + 1 : 1;
				STACK_CLICKS.put(pos, now);
				STACK_COUNTS.put(pos, count);
				if (count >= 3) {
					STACK_CLICKS.remove(pos);
					STACK_COUNTS.remove(pos);
					if (state.getValue(LAYERS) < 2) {
						level.setBlock(pos, vertical(state.setValue(LAYERS, 2), level, pos),
							Block.UPDATE_CLIENTS | Block.UPDATE_NEIGHBORS);
					} else if (level.getBlockState(pos.above()).isAir()) {
						BlockPos above = pos.above();
						level.setBlock(above, vertical(defaultBlockState(), level, above),
							Block.UPDATE_CLIENTS | Block.UPDATE_NEIGHBORS);
						refreshVertical(level, above);
					}
					if (!player.getAbilities().instabuild) {
						stack.shrink(1);
					}
				}
			}
			return InteractionResult.SUCCESS;
		}
		if (stack.getItem() instanceof BlockItem item && item.getBlock() instanceof PvcFittingBlock) {
			return InteractionResult.PASS;
		}
		return toggleDoor(state, level, pos, hit);
	}

	private InteractionResult toggleDoor(BlockState state, Level level, BlockPos pos, BlockHitResult hit) {
		if (!level.isClientSide()) {
			boolean upperDoor = state.getValue(LAYERS) >= 2 && hit.getLocation().y - pos.getY() >= 0.5;
			BlockState next = upperDoor
				? state.setValue(OPEN_HIGH, !state.getValue(OPEN_HIGH))
				: state.setValue(OPEN_LOW, !state.getValue(OPEN_LOW));
			level.setBlock(pos, next.setValue(OPEN, next.getValue(OPEN_LOW) || next.getValue(OPEN_HIGH)),
				Block.UPDATE_CLIENTS);
		}
		return InteractionResult.SUCCESS;
	}

	@Override
	protected boolean canBeReplaced(BlockState state, BlockPlaceContext context) {
		return context.getItemInHand().is(this.asItem()) && state.getValue(LAYERS) < 2;
	}

	@Override
	public BlockState getStateForPlacement(BlockPlaceContext context) {
		BlockState here = context.getLevel().getBlockState(context.getClickedPos());
		if (here.is(this)) {
			return vertical(here.setValue(LAYERS, here.getValue(LAYERS) + 1), context.getLevel(), context.getClickedPos());
		}
		return vertical(connections(this.defaultBlockState(), context.getLevel(), context.getClickedPos()), context.getLevel(), context.getClickedPos());
	}

	@Override
	public void setPlacedBy(Level level, BlockPos pos, BlockState state,
			net.minecraft.world.entity.LivingEntity placer, net.minecraft.world.item.ItemStack stack) {
		refreshVertical(level, pos);
	}

	@Override
	protected void onPlace(BlockState state, Level level, BlockPos pos, BlockState oldState, boolean movedByPiston) {
		if (!oldState.is(this)) {
			linkBelow(level, pos, true);
		}
	}

	@Override
	protected void affectNeighborsAfterRemoval(BlockState state, ServerLevel level, BlockPos pos, boolean movedByPiston) {
		if (!level.getBlockState(pos).is(this)) {
			linkBelow(level, pos, false);
		}
		super.affectNeighborsAfterRemoval(state, level, pos, movedByPiston);
	}

	private static void linkBelow(Level level, BlockPos pos, boolean up) {
		BlockPos belowPos = pos.below();
		BlockState below = level.getBlockState(belowPos);
		if (below.getBlock() instanceof CrabBoxBlock) {
			BlockState next = vertical(below, level, belowPos);
			if (next != below) {
				level.setBlock(belowPos, next, Block.UPDATE_CLIENTS | Block.UPDATE_NEIGHBORS);
			}
		}
	}

	private static void refreshVertical(Level level, BlockPos pos) {
		for (BlockPos p : new BlockPos[] { pos.below(), pos, pos.above() }) {
			BlockState state = level.getBlockState(p);
			if (state.getBlock() instanceof CrabBoxBlock) {
				level.setBlock(p, vertical(state, level, p), Block.UPDATE_CLIENTS | Block.UPDATE_NEIGHBORS);
			}
		}
	}

	@Override
	protected BlockState updateShape(BlockState state, LevelReader level, ScheduledTickAccess ticks,
			BlockPos pos, Direction direction, BlockPos neighborPos, BlockState neighborState, RandomSource random) {
		BlockState next = state;
		if (direction.getAxis().isHorizontal()) {
			BooleanProperty side = sideProperty(direction);
			if (side != null) {
				next = next.setValue(side, neighborState.is(this));
			}
		}
		return vertical(next, level, pos);
	}

	/** Lid and the vertical T follow the boxes actually above and below, not a stale notification. */
	static BlockState vertical(BlockState state, LevelReader level, BlockPos pos) {
		Block self = state.getBlock();
		BlockState above = level.getBlockState(pos.above());
		BlockState below = level.getBlockState(pos.below());
		int join = 0;
		if (below.is(self)) {
			join = below.getValue(LAYERS) >= 2 ? 2 : 1;
		}
		return state.setValue(UP, above.is(self)).setValue(JOIN, join);
	}

	static BooleanProperty sideProperty(Direction direction) {
		return switch (direction) {
			case NORTH -> NORTH;
			case SOUTH -> SOUTH;
			case EAST -> EAST;
			case WEST -> WEST;
			case UP -> UP;
			default -> null;
		};
	}

	static BlockState connections(BlockState state, LevelReader level, BlockPos pos) {
		Block self = state.getBlock();
		return state
			.setValue(NORTH, level.getBlockState(pos.north()).is(self))
			.setValue(SOUTH, level.getBlockState(pos.south()).is(self))
			.setValue(EAST, level.getBlockState(pos.east()).is(self))
			.setValue(WEST, level.getBlockState(pos.west()).is(self))
			.setValue(UP, level.getBlockState(pos.above()).is(self));
	}

	@Override
	protected VoxelShape getShape(BlockState state, net.minecraft.world.level.BlockGetter level, BlockPos pos, CollisionContext context) {
		if (state.getValue(LAYERS) >= 2) {
			return Shapes.block();
		}
		return Shapes.box(0, 0, 0, 1, 0.5, 1);
	}
}
