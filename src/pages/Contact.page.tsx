import { Box, Typography, Paper, Avatar, Grow, Fade } from "@mui/material";
import { BreadCrumb } from "../components/Breadcrumb";
import type { FC } from "react";

import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import EmailIcon from "@mui/icons-material/Email";
import PlaceIcon from "@mui/icons-material/Place";
import HeadsetMicIcon from "@mui/icons-material/HeadsetMic";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import MessageIcon from "@mui/icons-material/Message";

export const ContactPage: FC = () => {
  const contactMethods = [
    {
      icon: LocalPhoneIcon,
      title: "Teléfono",
      gradient: "#667eea",
      items: [
        { label: "Bob", value: "666 777 888" },
        { label: "John", value: "666 555 444" },
        { label: "Alice", value: "666 333 111" },
      ],
    },
    {
      icon: EmailIcon,
      title: "Email",
      gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      items: [
        { label: "General", value: "lucoenergia@gmail.com" },
        { label: "Soporte", value: "soporte@lucoenergia.com" },
      ],
    },
    {
      icon: PlaceIcon,
      title: "Dirección",
      gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      items: [
        { label: "", value: "Calle False 123" },
        { label: "", value: "44361 Luco de Jiloca" },
        { label: "", value: "Teruel, España" },
      ],
    },
    {
      icon: AccessTimeIcon,
      title: "Horario",
      gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
      items: [
        { label: "Lunes - Viernes", value: "9:00 - 18:00" },
        { label: "Sábados", value: "10:00 - 14:00" },
        { label: "Domingos", value: "Cerrado" },
      ],
    },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2, sm: 3 },
        p: { xs: 0, sm: 2, md: 3 },
        minHeight: "100vh",
        background: "#f5f7fa",
      }}
    >
      {/* Breadcrumb */}
      <BreadCrumb
        steps={[
          { label: "Inicio", href: "/" },
          { label: "Contacto", href: "/contact" },
        ]}
      />

      {/* Header Section */}
      <Fade in timeout={500}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            background: "#667eea",
            color: "white",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Avatar
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.2)",
                width: 56,
                height: 56,
              }}
            >
              <HeadsetMicIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 700, fontSize: { xs: "1.8rem", sm: "2.5rem" } }}>
                Contacto
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Estamos aquí para ayudarte con tu comunidad energética
              </Typography>
            </Box>
          </Box>

          <Typography variant="h6" sx={{ mt: 3, opacity: 0.95 }}>
            ¿Tienes alguna pregunta?
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            No dudes en ponerte en contacto con nosotros a través de cualquiera de los siguientes medios.
            Nuestro equipo está disponible para asistirte en todo lo relacionado con tu comunidad energética.
          </Typography>
        </Paper>
      </Fade>

      {/* Contact Cards Grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: 3,
        }}
      >
        {contactMethods.map((method, index) => {
          const Icon = method.icon;
          return (
            <Grow in timeout={600 + index * 100} key={method.title}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  background: "white",
                  boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)",
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  cursor: "pointer",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 8px 30px 0 rgba(0,0,0,0.12)",
                  },
                }}
              >
                {/* Icon Header */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    background: method.gradient,
                    mb: 2,
                  }}
                >
                  <Icon sx={{ color: "white", fontSize: 28 }} />
                </Box>

                {/* Title */}
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color: "#2d3748",
                    mb: 2,
                  }}
                >
                  {method.title}
                </Typography>

                {/* Contact Details */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {method.items.map((item, idx) => (
                    <Box key={idx}>
                      {item.label && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#718096",
                            fontWeight: 500,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          {item.label}
                        </Typography>
                      )}
                      <Typography
                        variant="body2"
                        sx={{
                          color: "#4a5568",
                          fontWeight: item.label ? 600 : 500,
                        }}
                      >
                        {item.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Grow>
          );
        })}
      </Box>

      {/* Additional Info Section */}
      <Fade in timeout={1000}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            background: "white",
            boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)",
            mt: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <Avatar
              sx={{
                bgcolor: "#fef3c7",
                width: 48,
                height: 48,
              }}
            >
              <MessageIcon sx={{ color: "#f59e0b", fontSize: 24 }} />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#2d3748" }}>
                ¿Prefieres escribirnos?
              </Typography>
              <Typography variant="body2" sx={{ color: "#718096" }}>
                Utiliza nuestro formulario de contacto y te responderemos lo antes posible
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: "#f7fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <Typography variant="body1" sx={{ color: "#4a5568", mb: 2 }}>
              Estamos comprometidos con el desarrollo sostenible y la transición energética de nuestra comunidad.
              Tu participación es fundamental para construir un futuro más verde y eficiente.
            </Typography>
            <Typography variant="body2" sx={{ color: "#718096" }}>
              <strong>Nota:</strong> Para consultas urgentes, te recomendamos contactarnos por teléfono durante
              nuestro horario de atención.
            </Typography>
          </Box>
        </Paper>
      </Fade>
    </Box>
  );
};