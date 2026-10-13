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
import net.minecraft.world.level.block.state.properties.EnumProperty;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.Vec3;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.Shapes;
import net.minecraft.world.phys.shapes.VoxelShape;

/**
 * T / L / cap. Snaps onto crab-box drains or the previous fitting; right-click turns the branch.
 */
public class PvcFittingBlock extends Block {
	public static final EnumProperty<PipeSize> DN = EnumProperty.create("dn", PipeSize.class);
	public static final EnumProperty<Direction> FACING = BlockStateProperties.HORIZONTAL_FACING;
	public static final EnumProperty<PipeBend> BEND = EnumProperty.create("bend", PipeBend.class);
	public static final EnumProperty<PipeMount> MOUNT = EnumProperty.create("mount", PipeMount.class);
	public static final EnumProperty<PipePort> PORT = EnumProperty.create("port", PipePort.class);

	public enum Kind { TEE, ELBOW, CAP, PIPE }

	private final Kind kind;

	public PvcFittingBlock(Kind kind, BlockBehaviour.Properties properties) {
		super(properties);
		this.kind = kind;
		this.registerDefaultState(this.stateDefinition.any()
			.setValue(DN, PipeSize.DN34)
			.setValue(FACING, Direction.NORTH)
			.setValue(BEND, PipeBend.LEFT)
			.setValue(MOUNT, PipeMount.AIR)
			.setValue(PORT, PipePort.SIDES));
	}

	public Kind kind() {
		return kind;
	}

	@Override
	protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
		builder.add(DN, FACING, BEND, MOUNT, PORT);
	}

	@Override
	public BlockState getStateForPlacement(BlockPlaceContext context) {
		BlockPos pos = context.getClickedPos();
		Direction prefer = context.getClickedFace().getOpposite();
		Direction toward = towardPipe(context.getLevel(), pos, prefer);
		PipeMount mount = mountAt(context.getLevel(), pos, toward);
		Direction facing = toward != null && toward.getAxis().isHorizontal()
			? toward
			: context.getHorizontalDirection();
		if (toward == null || toward.getAxis().isVertical()) {
			Direction clicked = context.getClickedFace();
			if (clicked.getAxis().isHorizontal()) {
				facing = kind == Kind.CAP ? clicked.getOpposite() : clicked;
			}
		}
		return defaultBlockState()
			.setValue(MOUNT, mount)
			.setValue(FACING, facing)
			.setValue(BEND, PipeBend.LEFT)
			.setValue(DN, PipeSizes.fromNeighbors(context.getLevel(), pos, context.getClickLocation()));
	}

	@Override
	protected BlockState updateShape(BlockState state, LevelReader level, ScheduledTickAccess ticks,
			BlockPos pos, Direction direction, BlockPos neighborPos, BlockState neighborState, RandomSource random) {
		Direction toward = towardPipe(level, pos, state.getValue(FACING));
		PipeMount mount = mountAt(level, pos, toward);
		BlockState next = state.setValue(MOUNT, mount);
		if (mount != PipeMount.AIR && toward != null && toward.getAxis().isHorizontal()) {
			next = next.setValue(FACING, toward);
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
		if (kind == Kind.CAP || kind == Kind.PIPE) {
			return state.setValue(FACING, state.getValue(FACING).getClockWise());
		}
		PipeBend next = state.getValue(BEND).next();
		BlockState out = state.setValue(BEND, next);
		if (next != PipeBend.LEFT) {
			return out;
		}
		if (kind == Kind.TEE) {
			PipePort port = state.getValue(PORT).other();
			out = out.setValue(PORT, port);
			if (port == PipePort.SIDES) {
				out = out.setValue(FACING, state.getValue(FACING).getClockWise());
			}
			return out;
		}
		out = out.setValue(FACING, state.getValue(FACING).getClockWise());
		return out;
	}

	static Direction towardPipe(LevelReader level, BlockPos pos, Direction prefer) {
		if (prefer.getAxis().isHorizontal() && attachable(level.getBlockState(pos.relative(prefer)), prefer)) {
			return prefer;
		}
		Direction fit = neighborKind(level, pos, PvcFittingBlock::isFitting);
		if (fit != null) {
			return fit;
		}
		for (Direction dir : Direction.Plane.HORIZONTAL) {
			if (isOutletToward(level.getBlockState(pos.relative(dir)), dir)) {
				return dir;
			}
		}
		Direction box = neighborKind(level, pos, PvcFittingBlock::isBox);
		if (box != null) {
			return box;
		}
		return neighborKind(level, pos, PvcFittingBlock::isDrum);
	}

	static boolean attachable(BlockState n, Direction fromHereToThem) {
		return isFitting(n) || isBox(n) || isOutletToward(n, fromHereToThem) || isDrum(n);
	}

	static PipeMount mountAt(LevelReader level, BlockPos pos, Direction toward) {
		if (toward == null) {
			return PipeMount.AIR;
		}
		BlockState n = level.getBlockState(pos.relative(toward));
		if (isBox(n)) {
			return PipeMount.BOX;
		}
		if (isOutletDrum(n)) {
			return PipeMount.DRUM;
		}
		if (isFitting(n)) {
			return switch (n.getValue(MOUNT)) {
				case AIR -> PipeMount.AIR;
				case DRUM -> PipeMount.DRUM;
				case BOX, LINE -> PipeMount.LINE;
			};
		}
		return PipeMount.AIR;
	}

	static Direction neighborKind(LevelReader level, BlockPos pos, java.util.function.Predicate<BlockState> test) {
		for (Direction dir : Direction.Plane.HORIZONTAL) {
			if (test.test(level.getBlockState(pos.relative(dir)))) {
				return dir;
			}
		}
		return null;
	}

	static boolean isBox(BlockState state) {
		return state.getBlock() == RasBlocks.CRAB_BOX;
	}

	static boolean isFitting(BlockState state) {
		return state.getBlock() instanceof PvcFittingBlock;
	}

	static boolean isDrum(BlockState state) {
		return state.getBlock() == RasBlocks.DRUM_FILTER || isOutletDrum(state);
	}

	static boolean isOutletDrum(BlockState state) {
		return state.getBlock() == RasBlocks.BLUE_WATER_DRUM_SIDE_OUTLET;
	}

	/** Fitting is on the PVC port side of the water drum. */
	static boolean isOutletToward(BlockState drum, Direction fromFittingToDrum) {
		return isOutletDrum(drum) && drum.getValue(WaterDrumBlock.FACING) == fromFittingToDrum.getOpposite();
	}

	@Override
	protected VoxelShape getShape(BlockState state, BlockGetter level, BlockPos pos, CollisionContext context) {
		if (state.getValue(MOUNT) != PipeMount.AIR) {
			return Shapes.box(0.05, 0.0, 0.05, 0.95, 0.35, 0.95);
		}
		float u = state.getValue(DN).units();
		double r = Math.max(4, u * 2.4) / 16.0;
		return Shapes.box(0.5 - r, 0.5 - r, 0.5 - r, 0.5 + r, 0.5 + r, 0.5 + r);
	}
}
