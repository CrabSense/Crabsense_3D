package com.crabsense.ras.block;

import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.util.RandomSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.BlockItem;
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
import net.minecraft.util.StringRepresentable;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;
import net.minecraft.world.level.block.state.properties.EnumProperty;
import net.minecraft.world.phys.BlockHitResult;
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
	public static final EnumProperty<Direction> HIGH_FACING =
		EnumProperty.create("high_facing", Direction.class, Direction.NORTH, Direction.SOUTH, Direction.WEST, Direction.EAST);
	public static final EnumProperty<PipeBend> HIGH_BEND = EnumProperty.create("high_bend", PipeBend.class);
	public static final EnumProperty<Kind> HIGH_KIND = EnumProperty.create("high_kind", Kind.class);

	public enum Kind implements StringRepresentable {
		TEE, ELBOW, CAP, PIPE;

		@Override
		public String getSerializedName() {
			return name().toLowerCase();
		}
	}

	private final Kind kind;

	public PvcFittingBlock(Kind kind, BlockBehaviour.Properties properties) {
		super(properties);
		this.kind = kind;
		this.registerDefaultState(this.stateDefinition.any()
			.setValue(DN, PipeSize.DN34)
			.setValue(FACING, Direction.NORTH)
			.setValue(BEND, PipeBend.LEFT)
			.setValue(MOUNT, PipeMount.AIR)
			.setValue(PORT, PipePort.SIDES)
			.setValue(HIGH_FACING, Direction.NORTH)
			.setValue(HIGH_BEND, PipeBend.LEFT)
			.setValue(HIGH_KIND, kind));
	}

	public Kind kind() {
		return kind;
	}

	@Override
	protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
		builder.add(DN, FACING, BEND, MOUNT, PORT, HIGH_FACING, HIGH_BEND, HIGH_KIND);
	}

	@Override
	public BlockState getStateForPlacement(BlockPlaceContext context) {
		BlockPos pos = context.getClickedPos();
		Direction prefer = context.getClickedFace().getOpposite();
		Direction toward = towardPipe(context.getLevel(), pos, prefer);
		PipeMount mount = mountAt(context.getLevel(), pos, toward, null);
		double ly = (context.getClickLocation().y - pos.getY()) * 16.0;
		boolean verticalClick = context.getClickedFace().getAxis().isVertical();
		if (toward != null && toward.getAxis().isHorizontal()) {
			BlockState n = context.getLevel().getBlockState(pos.relative(toward));
			if (n.getBlock() == RasBlocks.DRUM_FILTER && toward == Direction.SOUTH && ly >= 6.0) {
				mount = PipeMount.DRUM_HIGH;
			} else if (n.getBlock() instanceof PvcFittingBlock) {
				PipeMount theirs = n.getValue(MOUNT);
				if (theirs == PipeMount.DRUM_BOTH) {
					mount = ly >= 6.0 ? PipeMount.DRUM_HIGH : PipeMount.DRUM;
				} else if (theirs == PipeMount.DRUM || theirs == PipeMount.DRUM_HIGH) {
					mount = theirs;
				}
			}
		} else if (verticalClick) {
			mount = PipeMount.AIR;
		}
		Direction facing = toward != null && toward.getAxis().isHorizontal()
			? toward
			: context.getHorizontalDirection();
		if (toward == null || toward.getAxis().isVertical()) {
			Direction clicked = context.getClickedFace();
			if (clicked.getAxis().isHorizontal()) {
				facing = kind == Kind.CAP ? clicked.getOpposite() : clicked;
			}
		}
		PipeBend bend = PipeBend.LEFT;
		if (toward != null && toward.getAxis().isHorizontal()) {
			BlockState n = context.getLevel().getBlockState(pos.relative(toward));
			if (n.getBlock() instanceof PvcFittingBlock) {
				PipeMount theirs = n.getValue(MOUNT);
				if (theirs == PipeMount.DRUM_BOTH) {
					if (ly >= 6.0) {
						facing = n.getValue(HIGH_FACING);
						bend = n.getValue(HIGH_BEND);
					} else {
						facing = n.getValue(FACING);
						bend = n.getValue(BEND);
					}
				} else if (theirs == PipeMount.DRUM || theirs == PipeMount.DRUM_HIGH) {
					facing = n.getValue(FACING);
					bend = n.getValue(BEND);
				}
			}
		}
		if (mount != PipeMount.DRUM && mount != PipeMount.DRUM_HIGH && mount != PipeMount.DRUM_BOTH) {
			if (prefer.getAxis().isVertical()) {
				bend = prefer == Direction.DOWN ? PipeBend.DOWN : PipeBend.UP;
			}
			if (isFitting(context.getLevel().getBlockState(pos.below()))
				|| isOutletDrum(context.getLevel().getBlockState(pos.below()))) {
				bend = kind == Kind.PIPE ? PipeBend.UP : PipeBend.DOWN;
			} else if (isFitting(context.getLevel().getBlockState(pos.above()))) {
				bend = PipeBend.UP;
			}
		}
		BlockState here = context.getLevel().getBlockState(pos);
		if (!verticalClick && here.getBlock() instanceof PvcFittingBlock) {
			PipeMount was = here.getValue(MOUNT);
			if (was == PipeMount.DRUM && ly >= 6.0) {
				return addHighLane(here, context.getHorizontalDirection(), PipeBend.LEFT, kind);
			}
			if (was == PipeMount.DRUM_HIGH && ly < 6.0) {
				return addLowLane(here, this, facing, bend);
			}
			if (was == PipeMount.DRUM_BOTH) {
				return here;
			}
		}
		PipeSize dn = PipeSizes.fromAttach(context.getLevel(), pos, toward, context.getClickLocation());
		BlockState placed = defaultBlockState()
			.setValue(MOUNT, mount)
			.setValue(FACING, facing)
			.setValue(BEND, bend)
			.setValue(DN, dn);
		if (toward != null) {
			BlockState n = context.getLevel().getBlockState(pos.relative(toward));
			if (n.getBlock() instanceof PvcFittingBlock) {
				placed = placed.setValue(DN, n.getValue(DN));
			}
		}
		return placed;
	}

	@Override
	protected BlockState updateShape(BlockState state, LevelReader level, ScheduledTickAccess ticks,
			BlockPos pos, Direction direction, BlockPos neighborPos, BlockState neighborState, RandomSource random) {
		PipeMount cur = state.getValue(MOUNT);
		if (cur == PipeMount.DRUM || cur == PipeMount.DRUM_HIGH || cur == PipeMount.DRUM_BOTH) {
			return state;
		}
		Direction toward = towardPipe(level, pos, state.getValue(FACING));
		return state.setValue(MOUNT, mountAt(level, pos, toward, cur));
	}

	@Override
	protected InteractionResult useWithoutItem(BlockState state, Level level, BlockPos pos, Player player, BlockHitResult hit) {
		if (!level.isClientSide()) {
			level.setBlock(pos, turn(state, hit, pos), 3);
		}
		return InteractionResult.SUCCESS;
	}

	@Override
	protected boolean canBeReplaced(BlockState state, BlockPlaceContext context) {
		if (!(context.getItemInHand().getItem() instanceof BlockItem item)
			|| !(item.getBlock() instanceof PvcFittingBlock)) {
			return false;
		}
		PipeMount was = state.getValue(MOUNT);
		if (was != PipeMount.DRUM && was != PipeMount.DRUM_HIGH) {
			return false;
		}
		if (context.getClickedFace().getAxis().isVertical()) {
			return false;
		}
		double ly = (context.getClickLocation().y - context.getClickedPos().getY()) * 16.0;
		return was == PipeMount.DRUM ? ly >= 6.0 : ly < 6.0;
	}

	@Override
	protected InteractionResult useItemOn(ItemStack stack, BlockState state, Level level, BlockPos pos,
			Player player, InteractionHand hand, BlockHitResult hit) {
		if (stack.isEmpty() || player.isSecondaryUseActive()) {
			return useWithoutItem(state, level, pos, player, hit);
		}
		if (stack.getItem() instanceof BlockItem item && item.getBlock() instanceof PvcFittingBlock held) {
			PipeMount was = state.getValue(MOUNT);
			double ly = (hit.getLocation().y - pos.getY()) * 16.0;
			boolean sideClick = hit.getDirection().getAxis().isHorizontal();
			BlockState merged = null;
			if (sideClick && was == PipeMount.DRUM && ly >= 6.0) {
				merged = addHighLane(state, player.getDirection(), PipeBend.LEFT, held.kind());
			} else if (sideClick && was == PipeMount.DRUM_HIGH && ly < 6.0) {
				merged = addLowLane(state, held, player.getDirection(), PipeBend.LEFT);
			}
			if (merged != null) {
				if (!level.isClientSide()) {
					level.setBlock(pos, merged, 3);
					if (!player.getAbilities().instabuild) {
						stack.shrink(1);
					}
				}
				return InteractionResult.SUCCESS;
			}
			if (was == PipeMount.DRUM || was == PipeMount.DRUM_HIGH || was == PipeMount.DRUM_BOTH) {
				BlockPos adj = pos.relative(hit.getDirection());
				if (!level.getBlockState(adj).isAir()) {
					return useWithoutItem(state, level, pos, player, hit);
				}
			}
		}
		return InteractionResult.PASS;
	}

	static BlockState addHighLane(BlockState low, Direction facing, PipeBend bend, Kind highKind) {
		return low.setValue(MOUNT, PipeMount.DRUM_BOTH)
			.setValue(HIGH_FACING, facing)
			.setValue(HIGH_BEND, bend)
			.setValue(HIGH_KIND, highKind);
	}

	static BlockState addLowLane(BlockState high, PvcFittingBlock lowKind, Direction facing, PipeBend bend) {
		PvcFittingBlock existed = (PvcFittingBlock) high.getBlock();
		return lowKind.defaultBlockState()
			.setValue(MOUNT, PipeMount.DRUM_BOTH)
			.setValue(DN, high.getValue(DN))
			.setValue(FACING, facing)
			.setValue(BEND, bend)
			.setValue(HIGH_FACING, high.getValue(FACING))
			.setValue(HIGH_BEND, high.getValue(BEND))
			.setValue(HIGH_KIND, existed.kind());
	}

	BlockState turn(BlockState state, BlockHitResult hit, BlockPos pos) {
		boolean high = state.getValue(MOUNT) == PipeMount.DRUM_BOTH
			&& (hit.getLocation().y - pos.getY()) * 16.0 >= 6.0;
		Kind lane = high ? state.getValue(HIGH_KIND) : kind;
		return high
			? turnLane(state, HIGH_FACING, HIGH_BEND, false, lane)
			: turnLane(state, FACING, BEND, true, lane);
	}

	BlockState turnLane(BlockState state, EnumProperty<Direction> facingProp, EnumProperty<PipeBend> bendProp,
			boolean movePort, Kind lane) {
		if (lane == Kind.CAP) {
			return state.setValue(facingProp, state.getValue(facingProp).getClockWise());
		}
		if (lane == Kind.PIPE) {
			if (state.getValue(bendProp) == PipeBend.UP || state.getValue(bendProp) == PipeBend.DOWN) {
				return state.setValue(bendProp, PipeBend.LEFT);
			}
			Direction next = state.getValue(facingProp).getClockWise();
			if (next == Direction.NORTH) {
				return state.setValue(facingProp, next).setValue(bendProp, PipeBend.UP);
			}
			return state.setValue(facingProp, next);
		}
		PipeBend next = state.getValue(bendProp).next();
		BlockState out = state.setValue(bendProp, next);
		if (next != PipeBend.LEFT) {
			return out;
		}
		if (lane == Kind.TEE && movePort) {
			PipePort port = state.getValue(PORT).other();
			out = out.setValue(PORT, port);
			if (port == PipePort.SIDES) {
				out = out.setValue(facingProp, state.getValue(facingProp).getClockWise());
			}
			return out;
		}
		out = out.setValue(facingProp, state.getValue(facingProp).getClockWise());
		return out;
	}

	static Direction towardPipe(LevelReader level, BlockPos pos, Direction prefer) {
		if (attachable(level.getBlockState(pos.relative(prefer)), prefer)) {
			return prefer;
		}
		for (Direction dir : new Direction[] { Direction.DOWN, Direction.UP }) {
			if (isFitting(level.getBlockState(pos.relative(dir))) || isOutletDrum(level.getBlockState(pos.relative(dir)))) {
				return dir;
			}
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

	static PipeMount mountAt(LevelReader level, BlockPos pos, Direction toward, PipeMount current) {
		if (toward == null) {
			return PipeMount.AIR;
		}
		if (toward.getAxis().isVertical()) {
			return PipeMount.AIR;
		}
		BlockState n = level.getBlockState(pos.relative(toward));
		if (isBox(n)) {
			return PipeMount.BOX;
		}
		if (isOutletDrum(n)) {
			return PipeMount.DRUM;
		}
		if (n.getBlock() == RasBlocks.DRUM_FILTER) {
			if (current == PipeMount.DRUM_HIGH || current == PipeMount.DRUM_BOTH) {
				return current;
			}
			return PipeMount.DRUM;
		}
		if (isFitting(n)) {
			PipeMount theirs = n.getValue(MOUNT);
			if (current == PipeMount.DRUM || current == PipeMount.DRUM_HIGH || current == PipeMount.DRUM_BOTH) {
				return current;
			}
			return switch (theirs) {
				case AIR -> PipeMount.AIR;
				case DRUM, DRUM_HIGH -> theirs;
				case DRUM_BOTH -> PipeMount.DRUM;
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
		PipeMount mount = state.getValue(MOUNT);
		if (mount == PipeMount.DRUM || mount == PipeMount.DRUM_HIGH || mount == PipeMount.DRUM_BOTH) {
			return Shapes.box(0.05, 0.0, 0.05, 0.95, 0.75, 0.95);
		}
		if (mount != PipeMount.AIR) {
			return Shapes.box(0.05, 0.0, 0.05, 0.95, 0.35, 0.95);
		}
		double r = switch (state.getValue(DN)) {
			case DN60 -> 3.2 / 32.0;
			case DN34 -> 1.2 / 32.0;
			case DN27 -> 0.9 / 32.0;
		};
		r = Math.max(0.08, r + 0.04);
		PipeBend bend = state.getValue(BEND);
		if (bend == PipeBend.UP || bend == PipeBend.DOWN) {
			VoxelShape column = tube(Direction.UP, r);
			if (kind == Kind.PIPE) {
				return column;
			}
			return Shapes.or(column, tube(state.getValue(FACING), r));
		}
		VoxelShape run = tube(state.getValue(FACING), r);
		if (kind == Kind.PIPE || kind == Kind.CAP) {
			return run;
		}
		Direction branch = bend == PipeBend.RIGHT
			? state.getValue(FACING).getClockWise()
			: state.getValue(FACING).getCounterClockWise();
		return Shapes.or(run, tube(branch, r));
	}

	static VoxelShape tube(Direction axis, double r) {
		return switch (axis) {
			case UP, DOWN -> Shapes.box(0.5 - r, 0, 0.5 - r, 0.5 + r, 1, 0.5 + r);
			case EAST, WEST -> Shapes.box(0, 0.5 - r, 0.5 - r, 1, 0.5 + r, 0.5 + r);
			default -> Shapes.box(0.5 - r, 0.5 - r, 0, 0.5 + r, 0.5 + r, 1);
		};
	}
}
