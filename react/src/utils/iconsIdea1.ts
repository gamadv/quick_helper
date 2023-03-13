import { MouseEventHandler } from "react";
import {
  AiOutlineFullscreen as FullScreen,
  AiOutlinePlusCircle,
} from "react-icons/ai";
import {
  BsGearFill as Gear,
  BsImageFill,
  BsPeopleFill as People,
} from "react-icons/bs";
import {
  FaCashRegister as CashRegister,
  FaImage as Image,
  FaPlay as Play,
  FaRegClock as Clock,
  FaRegEye as OpenEye,
  FaRegEyeSlash as CloseEye,
  FaRegFileAlt as File,
  FaSearch as Search,
  FaStop as Stop,
  FaTrashAlt as Trash,
  FaTrashRestoreAlt as TrashRestore,
} from "react-icons/fa";
import {
  FiBell as Bell,
  FiMaximize2 as Maximize,
  FiMinimize2 as Minimize,
  FiUser as User,
} from "react-icons/fi";
import { HiOutlineUserCircle as UserCircle } from "react-icons/hi";
import { ImMug } from "react-icons/im";
import {
  IoIosArrowBack as IosArrowBack,
  IoIosArrowForward as IosArrowFroward,
  IoIosSend as Send,
  IoMdCheckmarkCircleOutline as CheckCircle,
} from "react-icons/io";
import { IoCloseCircle as CloseCircle } from "react-icons/io5";
import { IconType } from "react-icons/lib";
import {
  MdAdd as Add,
  MdArrowBack as ArrowBack,
  MdArrowDropDown as DropDown,
  MdArrowDropUp as DropUp,
  MdArrowForward as ArrowForward,
  MdCheckBox,
  MdCheckBoxOutlineBlank,
  MdClose as Close,
  MdCloudUpload,
  MdErrorOutline as ErrorOutline,
  MdHome as Home,
  MdInfoOutline as InfoOutline,
  MdKeyboardArrowDown as KbArrowDawn,
  MdMenu as Menu,
  MdMoreVert,
  MdPhotoCamera as PhotoCamera,
  MdRemove as Remove,
} from "react-icons/md";
import {
  RiFolderFill as Folder,
  RiFolderWarningFill as FolderWarning,
  RiHeartFill as Heart,
  RiHeartLine as HeartOutline,
  RiHeartsFill as DoubleHart,
  RiLogoutBoxLine as Logout,
} from "react-icons/ri";
import styled, { css, DefaultTheme } from "styled-components";
import { ReactComponent as Chaveiro } from "../../assets/Chaveiro.svg";
import { ReactComponent as Grid1X2 } from "../../assets/grid-1x2.svg";
import { ReactComponent as Grid2X2 } from "../../assets/grid-2x2.svg";
import { ReactComponent as Grid3X3 } from "../../assets/grid-3x3.svg";
import { ReactComponent as Grid4X4 } from "../../assets/grid-4x4.svg";
import { ReactComponent as Ima } from "../../assets/Ima.svg";

type TColor = keyof DefaultTheme["colors"];
type TSize = number;
type TMargin = number | string;

export interface IIcon {
  iconColor?: TColor;
  /** If it is `number`, it will be in `rem` */
  iconSize?: TSize;
  /** If it is `number`, it will be in `rem` */
  margin?: TMargin;
  /** If it is `number`, it will be in `rem` */
  marginTop?: TMargin;
  /** If it is `number`, it will be in `rem` */
  marginRight?: TMargin;
  /** If it is `number`, it will be in `rem` */
  marginBottom?: TMargin;
  /** If it is `number`, it will be in `rem` */
  marginLeft?: TMargin;
  clickable?: boolean;
  /** If it is `true`, not add css prop ``color` */
  notColor?: boolean;
  onClick?: MouseEventHandler<SVGElement>;
  onMouseOver?: MouseEventHandler<SVGElement>;
  onMouseEnter?: MouseEventHandler<SVGElement>;
  onMouseLeave?: MouseEventHandler<SVGElement>;
}

const getMargin = (margin: TMargin) =>
  margin ? (typeof margin === "number" ? `${margin}rem` : margin) : "invalid";

const getSize = (size: TSize) =>
  typeof size === "number" ? `${size}rem` : size;

const getColor = (color: TColor, theme: DefaultTheme) => theme.colors[color];

const addStyle = (Icon: IconType) => styled(Icon)<IIcon>`
  ${({ iconColor, notColor, theme }) =>
    !notColor &&
    css`
      color: ${iconColor ? getColor(iconColor, theme) : "inherit"};
    `};

  font-size: ${({ iconSize = 1 }) => getSize(iconSize)};

  margin-top: ${({ marginTop = 0 }) => getMargin(marginTop)};
  margin-right: ${({ marginRight = 0 }) => getMargin(marginRight)};
  margin-bottom: ${({ marginBottom = 0 }) => getMargin(marginBottom)};
  margin-left: ${({ marginLeft = 0 }) => getMargin(marginLeft)};
  margin: ${({ margin = 0 }) => getMargin(margin)};

  ${({ clickable }) =>
    clickable &&
    css`
      cursor: pointer;
      transition: filter 0.2s;

      :hover {
        filter: brightness(80%);
      }

      :active {
        filter: brightness(70%);
      }
    `}
`;

export const icons = {
  search: addStyle(Search),
  user: addStyle(User),
  bell: addStyle(Bell),
  kbArrowDawn: addStyle(KbArrowDawn),
  menu: addStyle(Menu),
  moreVert: addStyle(MdMoreVert),
  close: addStyle(Close),
  dropDown: addStyle(DropDown),
  dropUp: addStyle(DropUp),
  add: addStyle(Add),
  arrowBack: addStyle(ArrowBack),
  image: addStyle(Image),
  remove: addStyle(Remove),
  clock: addStyle(Clock),
  people: addStyle(People),
  infoOutline: addStyle(InfoOutline),
  arrowForward: addStyle(ArrowForward),
  closeCircle: addStyle(CloseCircle),
  openEye: addStyle(OpenEye),
  closeEye: addStyle(CloseEye),
  userCircle: addStyle(UserCircle),
  logout: addStyle(Logout),
  send: addStyle(Send),
  errorOutline: addStyle(ErrorOutline),
  file: addStyle(File),
  photoCamera: addStyle(PhotoCamera),
  home: addStyle(Home),
  folder: addStyle(Folder),
  folderWarning: addStyle(FolderWarning),
  checkCircle: addStyle(CheckCircle),
  mdCheckBox: addStyle(MdCheckBox),
  mdCheckBoxOutlineBlank: addStyle(MdCheckBoxOutlineBlank),
  trash: addStyle(Trash),
  trashRestore: addStyle(TrashRestore),
  cashRegister: addStyle(CashRegister),
  iosArrowBack: addStyle(IosArrowBack),
  iosArrowFroward: addStyle(IosArrowFroward),
  play: addStyle(Play),
  stop: addStyle(Stop),
  heart: addStyle(Heart),
  minimize: addStyle(Minimize),
  maximize: addStyle(Maximize),
  fullScreen: addStyle(FullScreen),
  heartOutline: addStyle(HeartOutline),
  doubleHart: addStyle(DoubleHart),
  grid4X4: addStyle(Grid4X4),
  grid3X3: addStyle(Grid3X3),
  grid2X2: addStyle(Grid2X2),
  grid1X2: addStyle(Grid1X2),
  outlinePlusCircle: addStyle(AiOutlinePlusCircle),
  cloud: addStyle(MdCloudUpload),
  chaveiro: addStyle(Chaveiro),
  ima: addStyle(Ima),
  photo: addStyle(BsImageFill),
  mug: addStyle(ImMug),
  gear: addStyle(Gear),
};
