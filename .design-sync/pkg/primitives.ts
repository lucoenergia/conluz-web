// Primitives for composing around the components. Designs must take MUI and the
// icons from here, not from their own copy: only this instance shares the
// ThemeProvider inside ConluzProvider, so anything else renders unthemed.
import {
  Box,
  Stack,
  Grid,
  Container,
  Typography,
  Button,
  ButtonGroup,
  IconButton,
  Link,
  Paper,
  Card,
  CardContent,
  Divider,
  Alert,
  Avatar,
  Chip,
  Badge,
  Skeleton,
  CircularProgress,
  LinearProgress,
  TextField,
  InputAdornment,
  InputBase,
  Autocomplete,
  MenuItem,
  Menu,
  Select,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  Switch,
  Radio,
  RadioGroup,
  Tooltip,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Breadcrumbs,
  Pagination,
  Drawer,
  AppBar,
  Toolbar,
  Snackbar,
  Collapse,
  Fade,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import AddIcon from "@mui/icons-material/Add";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import AddModeratorIcon from "@mui/icons-material/AddModerator";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import BadgeIcon from "@mui/icons-material/Badge";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import BatteryChargingFullIcon from "@mui/icons-material/BatteryChargingFull";
import BlockIcon from "@mui/icons-material/Block";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import BoltIcon from "@mui/icons-material/Bolt";
import BusinessIcon from "@mui/icons-material/Business";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CheckIcon from "@mui/icons-material/Check";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ClearIcon from "@mui/icons-material/Clear";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CompareArrowsRoundedIcon from "@mui/icons-material/CompareArrowsRounded";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DomainAddRoundedIcon from "@mui/icons-material/DomainAddRounded";
import DomainDisabledRoundedIcon from "@mui/icons-material/DomainDisabledRounded";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import EditIcon from "@mui/icons-material/Edit";
import EditCalendarOutlinedIcon from "@mui/icons-material/EditCalendarOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ElectricBoltIcon from "@mui/icons-material/ElectricBolt";
import ElectricBoltRoundedIcon from "@mui/icons-material/ElectricBoltRounded";
import ElectricMeterIcon from "@mui/icons-material/ElectricMeter";
import EmailIcon from "@mui/icons-material/Email";
import ErrorIcon from "@mui/icons-material/Error";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import EvStationIcon from "@mui/icons-material/EvStation";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExtensionIcon from "@mui/icons-material/Extension";
import ExtensionRoundedIcon from "@mui/icons-material/ExtensionRounded";
import FilterListIcon from "@mui/icons-material/FilterList";
import GroupAddOutlinedIcon from "@mui/icons-material/GroupAddOutlined";
import GroupOffRoundedIcon from "@mui/icons-material/GroupOffRounded";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import HeadsetMicIcon from "@mui/icons-material/HeadsetMic";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import HistoryIcon from "@mui/icons-material/History";
import HomeIcon from "@mui/icons-material/Home";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import KeyIcon from "@mui/icons-material/Key";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import LinkIcon from "@mui/icons-material/Link";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import LockOutlineIcon from "@mui/icons-material/LockOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LockResetIcon from "@mui/icons-material/LockReset";
import LogoutIcon from "@mui/icons-material/Logout";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import MenuIcon from "@mui/icons-material/Menu";
import MessageIcon from "@mui/icons-material/Message";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PeopleIcon from "@mui/icons-material/People";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import PercentIcon from "@mui/icons-material/Percent";
import PersonIcon from "@mui/icons-material/Person";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import PersonOffRoundedIcon from "@mui/icons-material/PersonOffRounded";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import PlaceIcon from "@mui/icons-material/Place";
import PowerIcon from "@mui/icons-material/Power";
import PowerOffIcon from "@mui/icons-material/PowerOff";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";
import RemoveIcon from "@mui/icons-material/Remove";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import RemoveCircleOutlineRoundedIcon from "@mui/icons-material/RemoveCircleOutlineRounded";
import RemoveModeratorIcon from "@mui/icons-material/RemoveModerator";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import SaveIcon from "@mui/icons-material/Save";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import SearchIcon from "@mui/icons-material/Search";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import SensorsIcon from "@mui/icons-material/Sensors";
import SolarPowerIcon from "@mui/icons-material/SolarPower";
import SolarPowerRoundedIcon from "@mui/icons-material/SolarPowerRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import UndoOutlinedIcon from "@mui/icons-material/UndoOutlined";
import UnfoldMoreRoundedIcon from "@mui/icons-material/UnfoldMoreRounded";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import WavingHandOutlinedIcon from "@mui/icons-material/WavingHandOutlined";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import WbSunnyRoundedIcon from "@mui/icons-material/WbSunnyRounded";

/** The MUI components the app composes with, sharing the Conluz theme instance. */
export const Mui = {
  Box,
  Stack,
  Grid,
  Container,
  Typography,
  Button,
  ButtonGroup,
  IconButton,
  Link,
  Paper,
  Card,
  CardContent,
  Divider,
  Alert,
  Avatar,
  Chip,
  Badge,
  Skeleton,
  CircularProgress,
  LinearProgress,
  TextField,
  InputAdornment,
  InputBase,
  Autocomplete,
  MenuItem,
  Menu,
  Select,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  Switch,
  Radio,
  RadioGroup,
  Tooltip,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Breadcrumbs,
  Pagination,
  Drawer,
  AppBar,
  Toolbar,
  Snackbar,
  Collapse,
  Fade,
};

/** The Material icons the app uses, keyed by their @mui/icons-material name without the "Icon" suffix. */
export const Icons = {
  AccessTime: AccessTimeIcon,
  AccountBalanceWalletRounded: AccountBalanceWalletRoundedIcon,
  Add: AddIcon,
  AddCircleOutline: AddCircleOutlineIcon,
  AddModerator: AddModeratorIcon,
  AddRounded: AddRoundedIcon,
  AdminPanelSettings: AdminPanelSettingsIcon,
  AdminPanelSettingsRounded: AdminPanelSettingsRoundedIcon,
  ArrowBack: ArrowBackIcon,
  ArrowDownward: ArrowDownwardIcon,
  ArrowUpward: ArrowUpwardIcon,
  Badge: BadgeIcon,
  BarChartRounded: BarChartRoundedIcon,
  BatteryChargingFull: BatteryChargingFullIcon,
  Block: BlockIcon,
  BlockOutlined: BlockOutlinedIcon,
  Bolt: BoltIcon,
  Business: BusinessIcon,
  BusinessRounded: BusinessRoundedIcon,
  CalendarMonthRounded: CalendarMonthRoundedIcon,
  CalendarToday: CalendarTodayIcon,
  Check: CheckIcon,
  CheckCircle: CheckCircleIcon,
  CheckCircleOutline: CheckCircleOutlineIcon,
  CheckCircleRounded: CheckCircleRoundedIcon,
  CheckRounded: CheckRoundedIcon,
  ChevronRight: ChevronRightIcon,
  ChevronRightRounded: ChevronRightRoundedIcon,
  Clear: ClearIcon,
  Close: CloseIcon,
  CloudUpload: CloudUploadIcon,
  CompareArrowsRounded: CompareArrowsRoundedIcon,
  ContentCopy: ContentCopyIcon,
  DeleteOutline: DeleteOutlineIcon,
  DescriptionOutlined: DescriptionOutlinedIcon,
  DomainAddRounded: DomainAddRoundedIcon,
  DomainDisabledRounded: DomainDisabledRoundedIcon,
  DownloadOutlined: DownloadOutlinedIcon,
  Edit: EditIcon,
  EditCalendarOutlined: EditCalendarOutlinedIcon,
  EditOutlined: EditOutlinedIcon,
  ElectricBolt: ElectricBoltIcon,
  ElectricBoltRounded: ElectricBoltRoundedIcon,
  ElectricMeter: ElectricMeterIcon,
  Email: EmailIcon,
  Error: ErrorIcon,
  ErrorOutline: ErrorOutlineIcon,
  EventAvailableOutlined: EventAvailableOutlinedIcon,
  EventBusyOutlined: EventBusyOutlinedIcon,
  EvStation: EvStationIcon,
  ExpandMore: ExpandMoreIcon,
  Extension: ExtensionIcon,
  ExtensionRounded: ExtensionRoundedIcon,
  FilterList: FilterListIcon,
  GroupAddOutlined: GroupAddOutlinedIcon,
  GroupOffRounded: GroupOffRoundedIcon,
  HandshakeOutlined: HandshakeOutlinedIcon,
  HeadsetMic: HeadsetMicIcon,
  HelpOutline: HelpOutlineIcon,
  History: HistoryIcon,
  Home: HomeIcon,
  HomeRounded: HomeRoundedIcon,
  InfoOutlined: InfoOutlinedIcon,
  Key: KeyIcon,
  LightbulbRounded: LightbulbRoundedIcon,
  Link: LinkIcon,
  LocalPhone: LocalPhoneIcon,
  LocationOn: LocationOnIcon,
  LockOpenOutlined: LockOpenOutlinedIcon,
  LockOutline: LockOutlineIcon,
  LockOutlined: LockOutlinedIcon,
  LockReset: LockResetIcon,
  Logout: LogoutIcon,
  MailOutline: MailOutlineIcon,
  ManageAccounts: ManageAccountsIcon,
  ManageAccountsRounded: ManageAccountsRoundedIcon,
  Menu: MenuIcon,
  Message: MessageIcon,
  MoreVert: MoreVertIcon,
  NavigateNext: NavigateNextIcon,
  OpenInNew: OpenInNewIcon,
  People: PeopleIcon,
  PeopleRounded: PeopleRoundedIcon,
  Percent: PercentIcon,
  Person: PersonIcon,
  PersonAdd: PersonAddIcon,
  PersonAddAltOutlined: PersonAddAltOutlinedIcon,
  PersonOffRounded: PersonOffRoundedIcon,
  PersonOutline: PersonOutlineIcon,
  PersonRounded: PersonRoundedIcon,
  Place: PlaceIcon,
  Power: PowerIcon,
  PowerOff: PowerOffIcon,
  PublicRounded: PublicRoundedIcon,
  PublishOutlined: PublishOutlinedIcon,
  Remove: RemoveIcon,
  RemoveCircleOutline: RemoveCircleOutlineIcon,
  RemoveCircleOutlineRounded: RemoveCircleOutlineRoundedIcon,
  RemoveModerator: RemoveModeratorIcon,
  RouteRounded: RouteRoundedIcon,
  Save: SaveIcon,
  SavingsRounded: SavingsRoundedIcon,
  ScheduleRounded: ScheduleRoundedIcon,
  Search: SearchIcon,
  SearchOff: SearchOffIcon,
  Sensors: SensorsIcon,
  SolarPower: SolarPowerIcon,
  SolarPowerRounded: SolarPowerRoundedIcon,
  SupportAgentRounded: SupportAgentRoundedIcon,
  TrendingDown: TrendingDownIcon,
  TrendingUp: TrendingUpIcon,
  UndoOutlined: UndoOutlinedIcon,
  UnfoldMoreRounded: UnfoldMoreRoundedIcon,
  UploadFileOutlined: UploadFileOutlinedIcon,
  Visibility: VisibilityIcon,
  VisibilityOff: VisibilityOffIcon,
  VisibilityOutlined: VisibilityOutlinedIcon,
  WarningAmber: WarningAmberIcon,
  WarningAmberOutlined: WarningAmberOutlinedIcon,
  WarningAmberRounded: WarningAmberRoundedIcon,
  WavingHandOutlined: WavingHandOutlinedIcon,
  WbSunny: WbSunnyIcon,
  WbSunnyRounded: WbSunnyRoundedIcon,
};
