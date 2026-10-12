package com.crabsense.ras.block;

import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.util.RandomSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.context.BlockPlaceContext;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.LevelReader;
import net.minecraft.world.level.ScheduledTickAccess;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.StateDefinition;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;
import net.minecraft.world.level.block.state.properties.BooleanProperty;
import net.minecraft.world.level.block.state.properties.EnumProperty;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.Vec3;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.Shapes;
import net.minecraft.world.phys.shapes.VoxelShape;

/**
 * T / L / cap. Snaps onto crab-box drains; right-click turns the branch.
 */
public class PvcFittingBlock extends Block {
	public static final EnumProperty<PipeSize> DN = EnumProperty.create("dn", PipeSize.class);
	public static final EnumProperty<Direction> FACING = BlockStateProperties.HORIZONTAL_FACING;
	public static final EnumProperty<PipeBend> BEND = EnumProperty.create("bend", PipeBend.class);
	public static final BooleanProperty ON_BOX = BooleanProperty.create("on_box");

	public enum Kind { TEE, ELBOW, CAP }

	private final Kind kind;

	public PvcFittingBlock(Kind kind, BlockBehaviour.Properties properties) {
		super(properties);
		this.kind = kind;
		this.registerDefaultState(this.stateDefinition.any()
			.setValue(DN, PipeSize.DN34)
			.setValue(FACING, Direction.NORTH)
			.setValue(BEND, PipeBend.LEFT)
			.setValue(ON_BOX, false));
	}

	public Kind kind() {
		return kind;
	}

	@Override
	protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
		builder.add(DN, FACING, BEND, ON_BOX);
	}

	@Override
	public BlockState getStateForPlacement(BlockPlaceContext context) {
		BlockPos pos = context.getClickedPos();
		Direction toBox = boxNeighbor(context.getLevel(), pos);
		boolean onBox = toBox != null;
		Direction facing = onBox ? toBox : context.getHorizontalDirection();
		if (!onBox) {
			Direction clicked = context.getClickedFace();
			if (clicked.getAxis().isHorizontal()) {
				facing = kind == Kind.CAP ? clicked.getOpposite() : clicked;
			}
		}
		return defaultBlockState()
			.setValue(ON_BOX, onBox)
			.setValue(FACING, facing)
			.setValue(BEND, PipeBend.LEFT)
			.setValue(DN, PipeSizes.fromNeighbors(context.getLevel(), pos, context.getClickLocation()));
	}

	@Override
	protected BlockState updateShape(BlockState state, LevelReader level, ScheduledTickAccess ticks,
			BlockPos pos, Direction direction, BlockPos neighborPos, BlockState neighborState, RandomSource random) {
		Direction toBox = boxNeighbor(level, pos);
		BlockState next = state.setValue(ON_BOX, toBox != null);
		if (toBox != null) {
			next = next.setValue(FACING, toBox);
		}
		PipeSize dn = PipeSizes.of(neighborState, neighborPos, Vec3.atCenterOf(neighborPos), direction.getOpposite());
		if (dn != null) {
			next = next.setValue(DN, dn);
		}
		return next;
	}

	@Override
	protected InteractionResult useWithoutItem(BlockState state, Level level, BlockPos pos, Player player, BlockHitResult hit) {
		if (!level.isClientSide()) {
			level.setBlock(pos, turn(state), 3);
		}
		return InteractionResult.SUCCESS;
	}

	@Override
	protected InteractionResult useItemOn(ItemStack stack, BlockState state, Level level, BlockPos pos,
			Player player, InteractionHand hand, BlockHitResult hit) {
		if (stack.is(this.asItem())) {
			return useWithoutItem(state, level, pos, player, hit);
		}
		return InteractionResult.PASS;
	}

	BlockState turn(BlockState state) {
		if (kind == Kind.CAP && !state.getValue(ON_BOX)) {
			return state.setValue(FACING, state.getValue(FACING).getClockWise());
		}
		if (state.getValue(ON_BOX) || kind != Kind.CAP) {
			return state.setValue(BEND, state.getValue(BEND).next());
		}
		return state.setValue(FACING, state.getValue(FACING).getClockWise());
	}

	static Direction boxNeighbor(LevelReader level, BlockPos pos) {
		for (Direction dir : Direction.Plane.HORIZONTAL) {
			if (level.getBlockState(pos.relative(dir)).getBlock() == RasBlocks.CRAB_BOX) {
				return dir;
			}
		}
		return null;
	}

	@Override
	protected VoxelShape getShape(BlockState state, BlockGetter level, BlockPos pos, CollisionContext context) {
		if (state.getValue(ON_BOX)) {
			return Shapes.box(0.05, 0.0, 0.05, 0.95, 0.35, 0.95);
		}
		float u = state.getValue(DN).units();
		double r = Math.max(4, u * 2.4) / 16.0;
		return Shapes.box(0.5 - r, 0.5 - r, 0.5 - r, 0.5 + r, 0.5 + r, 0.5 + r);
	}
}
