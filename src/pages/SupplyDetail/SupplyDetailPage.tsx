import { useCallback, useEffect, useMemo, useState, type FC } from "react";
import { Box } from "@mui/material";
import { useParams } from "react-router";
import { LoadingGraphCard } from "../../components/graph/LoadingGraphCard";
import { Graph } from "../../components/graph/Graph";
import { BreadCrumb } from "../../components/breadCrumb/BreadCrumb";
import { SupplyDetailCard } from "../../components/supplyDetailCard/SupplyDetailCard";
import { SupplyStatsCard } from "../../components/supplyStatsCard/SupplyStatsCard";
import { GraphFilter } from "../../components/graph/graphFilter";
import {
  useGetDailyProduction,
  useGetHourlyProduction,
  useGetMonthlyProduction,
  useGetYearlyProduction,
} from "../../api/production/production";
import { useGetSupply } from "../../api/supplies/supplies";
import { LoadingSupplyDetailCard } from "../../components/supplyDetailCard/loadingSupplyDetailCard";
import { getTimeRange } from "../../utils/getTimeRange";
import { useErrorDispatch } from "../../context/error.context";

export const SupplyDetailPage: FC = () => {
  const { supplyPointId = "" } = useParams();
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const errorDispatch = useErrorDispatch();
  const timeRangeData: string = useMemo(() => getTimeRange(startDate, endDate), [startDate, endDate]);

  const handleFilterChange = (startDate: Date, endDate: Date) => {
    setStartDate(startDate);
    setEndDate(endDate);
  };

  const { data: supplyPoint, isLoading: supplyPointLoading, error: supplyPointError } = useGetSupply(supplyPointId);

  // Since, in react, hook methos can't be inside conditional structures like 'if's we have to put all four calls at the top level of the componet and control wether the request actually gets triggered with the enabled parameter
  const {
    data: hourlyData,
    isLoading: hourlyIsLoading,
    error: hourlyError,
  } = useGetHourlyProduction(
    { supplyId: supplyPointId, startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    { query: { enabled: timeRangeData == "hour" } },
  );
  const {
    data: dailyData,
    isLoading: dailyIsLoading,
    error: dailyError,
  } = useGetDailyProduction(
    { supplyId: supplyPointId, startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    { query: { enabled: timeRangeData == "day" } },
  );
  const {
    data: monthlyData,
    isLoading: monthlyIsLoading,
    error: montlyError,
  } = useGetMonthlyProduction(
    { supplyId: supplyPointId, startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    { query: { enabled: timeRangeData == "month" } },
  );
  const {
    data: yearlyData,
    isLoading: yearlyIsLoading,
    error: yearlyError,
  } = useGetYearlyProduction(
    { supplyId: supplyPointId, startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    { query: { enabled: timeRangeData == "year" } },
  );

  const isLoading = hourlyIsLoading || dailyIsLoading || monthlyIsLoading || yearlyIsLoading;
  const error = hourlyError || dailyError || montlyError || yearlyError;

  useEffect(() => {
    if (error)
      errorDispatch(
        "Hay habido un problema al cargar la información de este punto de suministro. Por favor, inténtalo más tarde",
      );
  }, [error]);

  const data = useMemo(() => {
    switch (timeRangeData) {
      case "hour":
        return hourlyData as number[];
      case "day":
        return dailyData as number[];
      case "month":
        return monthlyData as number[];
      case "year":
        return yearlyData as number[];
    }
  }, [hourlyData, dailyData, monthlyData, yearlyData, timeRangeData]);

  // This is all for mocking the graph data until we can get actual data
  const categories =
    timeRangeData === "day"
      ? ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
      : timeRangeData === "month"
        ? ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
        : ["2021", "2022", "2023", "2024", "2025"];

  const getMockedData = useCallback(() => {
    if (timeRangeData === "day") {
      return [30, 40, 45, 50, 49, 60, 70]; // mocked data para 7 días
    } else if (timeRangeData === "month") {
      return [30, 40, 45, 50, 49, 60, 70, 91, 35, 45, 55, 65]; //mocked data para 12 meses
    } else {
      return [30, 40, 45, 50, 49]; // mocked data para 5 años
    }
  }, [timeRangeData]);

  const measurementData = [
    {
      name: "Producción Asignada",
      value: [],
      info: "Cantidad de energía generada por la comunidad que te ha sido asignada a este punto de suministro en base a su coeficiente de reparto",
    },
    {
      name: "Consumo de red",
      value: [],
      info: "Cantidad de energía consumida de la red",
    },
    {
      name: "Autoconsumo",
      value: [],
      info: "Cantidad de energía autoconsumida",
    },
    {
      name: "Excedente",
      value: [],
      info: "Cantidad de energía no consumida",
    },
  ];

  return (
    <Box className="grid gap-4">
      <BreadCrumb
        steps={[
          { label: "Consumo", href: "/supply-points" },
          { label: supplyPoint?.code ? supplyPoint?.code : supplyPointId, href: "#" },
        ]}
      />
      {!supplyPointLoading && !supplyPointError && (
        <SupplyDetailCard
          name={supplyPoint?.name}
          address={supplyPoint?.address}
          cups={supplyPoint?.code}
          partitionCoeficient={supplyPoint?.partitionCoefficient ? supplyPoint?.partitionCoefficient * 100 : 0}
        />
      )}
      {supplyPointLoading && <LoadingSupplyDetailCard />}
      <GraphFilter handleChange={handleFilterChange} />
      <SupplyStatsCard consumption={0} selfconstumptionRate={0} selfconsumption={0} surplus={0} utilizationRate={0} />
      <Box className="grid md:grid-cols-2 gap-4">
        {!isLoading &&
          !error &&
          measurementData.map((item, index) => (
            <Graph
              key={index}
              title={item.name}
              values={data?.length ? data : getMockedData()}
              xAxis={categories}
              info={item.info}
            />
          ))}
        {isLoading && Array.from({ length: 4 }).map((_, i) => <LoadingGraphCard key={i} />)}
      </Box>
    </Box>
  );
};
