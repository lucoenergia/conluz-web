import { useMemo, useEffect, useState, type FC } from "react";
import Chart from "react-apexcharts";
import { useTheme } from "@mui/material/styles";

interface EnhancedGraphBarProps {
  title: string;
  categories: string[] | number[];
  data: number[];
  variant?: "production" | "consumption" | "default";
  height?: number | string;
}

export const EnhancedGraphBar: FC<EnhancedGraphBarProps> = ({
  title,
  categories,
  data,
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
      case "production":
        return {
          colors: ["#8b5cf6"],
          gradient: {
            shade: "light",
            type: "vertical",
            shadeIntensity: 0.5,
            gradientToColors: ["#667eea"],
            inverseColors: false,
            opacityFrom: 0.85,
            opacityTo: 0.65,
            stops: [0, 100]
          }
        };
      case "consumption":
        return {
          colors: ["#ec4899"],
          gradient: {
            shade: "light",
            type: "vertical",
            shadeIntensity: 0.5,
            gradientToColors: ["#f5576c"],
            inverseColors: false,
            opacityFrom: 0.85,
            opacityTo: 0.65,
            stops: [0, 100]
          }
        };
      default:
        return {
          colors: ["#3b82f6"],
          gradient: {
            shade: "light",
            type: "vertical",
            shadeIntensity: 0.5,
            gradientToColors: ["#60a5fa"],
            inverseColors: false,
            opacityFrom: 0.85,
            opacityTo: 0.65,
            stops: [0, 100]
          }
        };
    }
  };

  const chartColors = getChartColors();

  const options = useMemo(
    () => ({
      chart: {
        id: "enhanced-bar",
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
          borderRadius: 8,
          borderRadiusApplication: "end" as const,
          borderRadiusWhenStacked: "last" as const,
          columnWidth: "45%",
          distributed: false,
          dataLabels: {
            position: "top" as const,
          },
        },
      },
      dataLabels: {
        enabled: false,
      },
      colors: chartColors.colors,
      fill: {
        type: "gradient",
        gradient: chartColors.gradient
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
          formatter: (value: number) => `${value} kWh`
        },
      },
      tooltip: {
        enabled: true,
        y: {
          formatter: (value: number) => `${value.toFixed(2)} kWh`
        },
        style: {
          fontSize: "12px",
        },
        theme: "light",
        custom: function({ series, seriesIndex, dataPointIndex, w }: { series: number[][], seriesIndex: number, dataPointIndex: number, w: { globals: { labels: string[] } } }) {
          const value = series[seriesIndex][dataPointIndex];
          const category = w.globals.labels[dataPointIndex];
          return (
            '<div class="custom-tooltip" style="padding: 10px; background: white; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">' +
            '<p style="margin: 0 0 4px 0; font-weight: 600; color: #1e293b;">' + category + '</p>' +
            '<p style="margin: 0; color: #64748b; font-size: 14px;">' +
            '<span style="color:' + chartColors.colors[0] + '; font-weight: 600;">' + value.toFixed(2) + ' kWh</span>' +
            '</p>' +
            '</div>'
          );
        }
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
                columnWidth: "70%",
                borderRadius: 6,
              }
            },
            xaxis: {
              labels: {
                rotate: -45,
                style: {
                  fontSize: "10px",
                }
              }
            }
          }
        },
        {
          breakpoint: 768,
          options: {
            plotOptions: {
              bar: {
                columnWidth: "60%",
                borderRadius: 6,
              }
            }
          }
        }
      ]
    }),
    [categories, chartColors, theme],
  );

  const series = useMemo(
    () => [
      {
        name: title,
        data: data,
      },
    ],
    [data, title],
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