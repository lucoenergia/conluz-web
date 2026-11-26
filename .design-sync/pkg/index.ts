// Entry for the claude.ai/design sync: the presentational components of
// conluz-web that render with only the theme and a router. Components that
// fetch, mutate, or read auth/community context are left out on purpose.
export { ConluzProvider } from "./ConluzProvider";
export { Mui, Icons } from "./primitives";
export { theme } from "../../src/theme";
export { colors, alphas, shadows, radii, fontSizes, fontFamilies, motion, interactiveTransition } from "../../src/theme/tokens";
export { sxStyles } from "../../src/theme/sx";
// The colour of each energy concept, so designs mark community energy, the
// grid, assigned and exported energy, and savings the way the app does.
export { ENERGY_COLORS, SAVINGS_COLOR } from "../../src/components/EnergyFigures/energyColors";
// The period presets and resolver the period pickers and PeriodHeader take,
// and the consumption series builders that turn API buckets into the view the
// evolution charts and rows draw, so designs derive both the way the app does.
export { LATEST, YEAR, LAST_12, LAST_7, LAST_30, DAY_YEAR, resolvePeriod } from "../../src/components/period/historicalPeriod";
export { toConsumptionSeriesView, CONSUMPTION_LOOK, CONSUMPTION_EVOLUTION_COPY } from "../../src/components/evolution/consumptionSeries";
export { slotDetail } from "../../src/components/evolution/evolutionChartOptions";
// The empty form values, and an existing plant's, the form field sets start from.
export { EMPTY_PLANT_FIELD_VALUES, plantFieldValuesOf } from "../../src/components/PlantForm/plantFields";
export { EMPTY_SUPPLY_FIELD_VALUES } from "../../src/components/SupplyForm/supplyFields";
// Pure selectors that turn an agreement + its coefficients into the state the
// lifecycle banner and spine render, so designs derive it the way the app does.
export { selectSharingAgreementNextStep } from "../../src/pages/production/selectSharingAgreementNextStep";
export { selectSharingAgreementLifecycleView } from "../../src/pages/production/sharingAgreementLifecycle";

export { ActionStatus } from "../../src/components/ActionStatus/ActionStatus";
export { ADDRESS_MAX_LENGTH, AddressField } from "../../src/components/AddressField/AddressField";
export { AppAccordion } from "../../src/components/AppAccordion/AppAccordion";
export { LoadingAppAccordion } from "../../src/components/AppAccordion/LoadingAppAccordion";
export { AppCard } from "../../src/components/AppCard/AppCard";
export { AttentionPanel } from "../../src/components/AttentionPanel/AttentionPanel";
export { BreadCrumb } from "../../src/components/Breadcrumb/BreadCrumb";
export { CapabilityLoadError } from "../../src/components/Auth/CapabilityLoadError";
export { CoefficientActionsMenuItems } from "../../src/components/CoefficientActionsMenu/CoefficientActionsMenu";
export { CoefficientHistory } from "../../src/components/CoefficientHistory/CoefficientHistory";
export { CommunityScopeHeader } from "../../src/components/CommunityScopeHeader/CommunityScopeHeader";
export { CommunityStatusChip } from "../../src/components/CommunityStatusChip/CommunityStatusChip";
export { ContactChannelList } from "../../src/components/ContactChannelList/ContactChannelList";
export { ContactChannelEditor } from "../../src/components/ContactChannelEditor/ContactChannelEditor";
export { ContactChannelReorderList } from "../../src/components/ContactChannelReorderList/ContactChannelReorderList";
export { DetailHeader } from "../../src/components/DetailHeader/DetailHeader";
export { EmptyState } from "../../src/components/EmptyState/EmptyState";
export { EstimatedPriceLabel } from "../../src/components/EnergyFigures/EstimatedPriceLabel";
export { LegendEntry } from "../../src/components/EnergyFigures/LegendEntry";
export { NeutralNotice } from "../../src/components/EnergyFigures/NeutralNotice";
export { PeriodHeader } from "../../src/components/EnergyFigures/PeriodHeader";
export { PeriodTotals } from "../../src/components/EnergyFigures/PeriodTotals";
export { PeriodUsageCard } from "../../src/components/EnergyFigures/PeriodUsageCard";
export { Swatch } from "../../src/components/EnergyFigures/Swatch";
export { ChartScrollArea } from "../../src/components/evolution/ChartScrollArea";
export { Evolution } from "../../src/components/evolution/Evolution";
export { EnergyEvolutionChart, SavingsEvolutionChart } from "../../src/components/evolution/EvolutionCharts";
export { EnergyEvolutionRows, SavingsEvolutionRows } from "../../src/components/evolution/EvolutionRows";
export { PairedTerm } from "../../src/components/evolution/PairedTerm";
export { SeriesLegend } from "../../src/components/evolution/SeriesLegend";
export { StateMark } from "../../src/components/evolution/StateMark";
export { FilterChipsBar } from "../../src/components/FilterChips/FilterChipsBar";
export { PasswordInput } from "../../src/components/Forms/PasswordInput";
export { PasswordPolicyHint } from "../../src/components/Forms/PasswordPolicyHint";
export { CustomRangePicker } from "../../src/components/period/CustomRangePicker";
export { PeriodSelector } from "../../src/components/period/PeriodSelector";
export { Logo } from "../../src/components/Header/Logo";
export { LabeledIcon } from "../../src/components/LabeledIcon/LabeledIcon";
export { ListTable, ListTableHeaderText } from "../../src/components/ListTable/ListTable";
export { RowActionsMenu } from "../../src/components/ListTable/RowActionsMenu";
export { LoadErrorAlert } from "../../src/components/LoadErrorAlert/LoadErrorAlert";
export { MemberPicker } from "../../src/components/MemberPicker/MemberPicker";
export { MenuLinkItem } from "../../src/components/Menu/MenuLinkItem";
export { MenuTemplate } from "../../src/components/Menu/MenuTemplate";
export { SideMenu } from "../../src/components/Menu/SideMenu";
export { AppModal } from "../../src/components/Modals/AppModal";
export { ConfirmationModal } from "../../src/components/Modals/ConfirmationModal";
export { CoefficientDialogErrorPanel, CoefficientTargetSummary } from "../../src/components/Modals/coefficientLifecycleDialogHelpers";
export { DisableSuccessModal } from "../../src/components/Modals/DisableSuccessModal";
export { EnableSuccessModal } from "../../src/components/Modals/EnableSuccesModal";
export { ApplyCoefficientDateConfirmationModal } from "../../src/components/Modals/ApplyCoefficientDateConfirmationModal";
export { CloseCoefficientConfirmationModal } from "../../src/components/Modals/CloseCoefficientConfirmationModal";
export { CorrectCoefficientDateConfirmationModal } from "../../src/components/Modals/CorrectCoefficientDateConfirmationModal";
export { DeactivateOrReopenCoefficientConfirmationModal } from "../../src/components/Modals/DeactivateOrReopenCoefficientConfirmationModal";
export { DeleteConfirmationModal } from "../../src/components/Modals/DeleteConfirmationModal";
export { DeleteSharingAgreementConfirmationModal } from "../../src/components/Modals/DeleteSharingAgreementConfirmationModal";
export { DeleteSupplyConfirmationModal } from "../../src/components/Modals/DeleteSupplyConfirmationModal";
export { DisableConfirmationModal } from "../../src/components/Modals/DisableConfirmationModal";
export { EnableConfirmationModal } from "../../src/components/Modals/EnableConfirmationModal";
export { PublishSharingAgreementConfirmationModal } from "../../src/components/Modals/PublishSharingAgreementConfirmationModal";
export { RevertSharingAgreementToDraftConfirmationModal } from "../../src/components/Modals/RevertSharingAgreementToDraftConfirmationModal";
export { NextStepBanner } from "../../src/components/NextStepBanner/NextStepBanner";
export { Notice } from "../../src/components/Notice/Notice";
export { PaginationOutlined } from "../../src/components/Pagination/Pagination";
export { PlantDetailHeader } from "../../src/components/PlantDetailHeader/PlantDetailHeader";
export { PlantSection } from "../../src/components/PlantSection/PlantSection";
export { PlantFormFields } from "../../src/components/PlantForm/PlantFormFields";
export { PlatformKpiCard } from "../../src/components/PlatformKpiCard/PlatformKpiCard";
export { ReadOnlyField } from "../../src/components/ReadOnlyField/ReadOnlyField";
export { RecordList } from "../../src/components/RecordList/RecordList";
export { ResponsiveRecordList } from "../../src/components/ResponsiveRecordList/ResponsiveRecordList";
export { ListPagination } from "../../src/components/ListPagination/ListPagination";
export { ListFilters } from "../../src/components/ListFilters/ListFilters";
export { ResultStatus } from "../../src/components/ResultStatus/ResultStatus";
export { RouteFallback } from "../../src/components/RouteFallback/RouteFallback";
export { SearchBar } from "../../src/components/SearchBar/SearchBar";
export { SectionHeading } from "../../src/components/SectionHeading/SectionHeading";
export { SharingAgreementActionButton } from "../../src/components/SharingAgreementActionButton/SharingAgreementActionButton";
export { SharingAgreementApplicationPanel } from "../../src/components/SharingAgreementApplicationPanel/SharingAgreementApplicationPanel";
export { SharingAgreementCoefficientCard, SharingAgreementCoefficientTableRow } from "../../src/components/SharingAgreementCoefficientRow/SharingAgreementCoefficientRow";
export { SharingAgreementCoefficientSumGauges } from "../../src/components/SharingAgreementCoefficientSumGauges/SharingAgreementCoefficientSumGauges";
export { SharingAgreementFormDialog } from "../../src/components/SharingAgreementFormDialog/SharingAgreementFormDialog";
export { SharingAgreementLifecycleSpine } from "../../src/components/SharingAgreementLifecycleSpine/SharingAgreementLifecycleSpine";
export { SharingAgreementNextStepBanner } from "../../src/components/SharingAgreementNextStepBanner/SharingAgreementNextStepBanner";
export { SharingAgreementOutgoingSupplies } from "../../src/components/SharingAgreementOutgoingSupplies/SharingAgreementOutgoingSupplies";
export { SharingAgreementStatusChip } from "../../src/components/SharingAgreementStatusChip/SharingAgreementStatusChip";
export { Stat } from "../../src/components/Stat/Stat";
export { LoadingStat } from "../../src/components/Stat/LoadingStat";
export { SupplyDetailCard } from "../../src/components/SupplyDetailCard/SupplyDetailCard";
export { LoadingSupplyDetailCard } from "../../src/components/SupplyDetailCard/loadingSupplyDetailCard";
export { SupplyDetailHeader } from "../../src/components/SupplyDetailHeader/SupplyDetailHeader";
export { SupplySelector } from "../../src/components/SupplySelector/SupplySelector";
export { SupplyFormFields } from "../../src/components/SupplyForm/SupplyFormFields";
export { SupplyStatsCard } from "../../src/components/SupplyStatsCard/SupplyStatsCard";
export { LoadingSupplyStatsCard } from "../../src/components/SupplyStatsCard/LoadingSupplyStatsCard";
export { SupportCard } from "../../src/components/SupportCard/SupportCard";
export { TagComponent } from "../../src/components/Tag/Tag";
