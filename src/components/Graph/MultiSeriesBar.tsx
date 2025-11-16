import { useMemo, useEffect, useState, type FC } from "react";
import Chart from "react-apexcharts";
import { useTheme } from "@mui/material/styles";

interface SeriesData {
  name: string;
  data: number[];
  color?: string;
}

interface MultiSeriesBarProps {
  categories: string[] | number[];
  series: SeriesData[];
  variant?: "production" | "consumption" | "default";
  height?: number | string;
}

export const MultiSeriesBar: FC<MultiSeriesBarProps> = ({
  categories,
  series,
  variant = "default",
  height = "100%"
}) => {
  const theme = useTheme();
  const [chartKey, setChartKey] = useState(0);

  // Force chart re-render on window resize (sidebar toggle)
  useEffect(() => {
    const handleResize = () => {
      setTimeout(() => {
        setChartKey(prev => prev + 1);
      }, 300);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getChartColors = () => {
    switch (variant) {
      case "consumption":
        return ["#ef4444", "#10b981", "#f59e0b"]; // Red, Green, Amber
      case "production":
        return ["#8b5cf6", "#3b82f6", "#10b981"]; // Purple, Blue, Green
      default:
        return ["#3b82f6", "#8b5cf6", "#10b981"]; // Blue, Purple, Green
    }
  };

  const defaultColors = getChartColors();
  const colors = series.map((s, index) => s.color || defaultColors[index] || defaultColors[0]);

  const options = useMemo(
    () => ({
      chart: {
        id: "enhanced-multi-bar",
        toolbar: {
          show: false,
        },
        redrawOnWindowResize: true,
        animations: {
          enabled: true,
          easing: "easeinout",
          speed: 800,
          animateGradually: {
            enabled: true,
            delay: 150
          },
          dynamicAnimation: {
            enabled: true,
            speed: 350
          }
        },
        background: "transparent",
        fontFamily: theme.typography.fontFamily,
      },
      plotOptions: {
        bar: {
          borderRadius: 6,
          borderRadiusApplication: "end" as const,
          borderRadiusWhenStacked: "last" as const,
          columnWidth: "60%",
          distributed: false,
          dataLabels: {
            position: "top" as const,
          },
        },
      },
      dataLabels: {
        enabled: false,
      },
      colors: colors,
      fill: {
        opacity: 0.9,
        type: "solid",
      },
      grid: {
        show: true,
        borderColor: "#e2e8f0",
        strokeDashArray: 5,
        position: "back" as const,
        xaxis: {
          lines: {
            show: false
          }
        },
        yaxis: {
          lines: {
            show: true
          }
        },
        padding: {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
        },
      },
      xaxis: {
        categories: categories,
        labels: {
          style: {
            colors: "#64748b",
            fontSize: "12px",
            fontWeight: 400,
          },
        },
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: "#64748b",
            fontSize: "12px",
            fontWeight: 400,
          },
          formatter: (value: number) => `${value.toFixed(1)} kWh`
        },
      },
      legend: {
        show: true,
        position: "top" as const,
        horizontalAlign: "left" as const,
        fontSize: "12px",
        fontWeight: 500,
        markers: {
          size: 6,
          offsetX: -2,
        },
        itemMargin: {
          horizontal: 10,
          vertical: 5,
        },
        onItemClick: {
          toggleDataSeries: true,
        },
      },
      tooltip: {
        enabled: true,
        shared: true,
        intersect: false,
        custom: function({ series: seriesData, seriesIndex, dataPointIndex, w }: any) {
          const category = w.globals.labels[dataPointIndex];
          let tooltipContent = `<div style="padding: 8px 12px; background: white; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">`;
          tooltipContent += `<div style="font-weight: 600; margin-bottom: 8px; color: #1f2937;">${category}</div>`;

          // Only show visible series (not hidden by legend click)
          w.config.series.forEach((s: any, index: number) => {
            // Check if series is visible using globals.collapsedSeriesIndices
            const isHidden = w.globals.collapsedSeriesIndices.includes(index);
            if (isHidden) return;

            const value = seriesData[index][dataPointIndex];
            const color = w.config.colors[index];
            const seriesName = s.name;

            tooltipContent += `
              <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></span>
                <span style="color: #64748b; font-size: 12px;">${seriesName}:</span>
                <span style="font-weight: 600; color: #1f2937; font-size: 12px;">${value !== undefined && value !== null ? value.toFixed(2) : '0.00'} kWh</span>
              </div>
            `;
          });

          tooltipContent += `</div>`;
          return tooltipContent;
        },
        style: {
          fontSize: "12px",
        },
        theme: "light",
      },
      states: {
        hover: {
          filter: {
            type: "darken",
            value: 0.15,
          }
        },
        active: {
          filter: {
            type: "darken",
            value: 0.35,
          }
        }
      },
      responsive: [
        {
          breakpoint: 600,
          options: {
            plotOptions: {
              bar: {
                columnWidth: "80%",
                borderRadius: 4,
              }
            },
            xaxis: {
              labels: {
                rotate: -45,
                style: {
                  fontSize: "10px",
                }
              }
            },
            legend: {
              position: "bottom" as const,
            }
          }
        },
        {
          breakpoint: 768,
          options: {
            plotOptions: {
              bar: {
                columnWidth: "70%",
                borderRadius: 5,
              }
            }
          }
        }
      ]
    }),
    [categories, colors, theme],
  );

  return (
    <Chart
      key={chartKey}
      options={options}
      series={series}
      type="bar"
      height={height}
      width="100%"
    />
  );
};
