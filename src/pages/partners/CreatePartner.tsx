import { type FC, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Avatar,
  TextField,
  Button,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
} from "@mui/material";
import { useNavigate } from "react-router";
import type { CreateUserBody } from "../../api/models";
import { CreateUserBodyRole } from "../../api/models";
import { useCreateUser } from "../../api/users/users";
import { useErrorDispatch } from "../../context/error.context";
import { BreadCrumb } from "../../components/Breadcrumb";
import PersonIcon from "@mui/icons-material/Person";

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    "&.Mui-focused fieldset": {
      borderColor: "#667eea",
    },
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "#667eea",
  },
};

export const CreatePartnerPage: FC = () => {
  const navigate = useNavigate();
  const errorDispatch = useErrorDispatch();
  const createUser = useCreateUser();

  const [formData, setFormData] = useState({
    fullName: "",
    personalId: "",
    number: "",
    email: "",
    address: "",
    phoneNumber: "",
    password: "",
    passwordConfirm: "",
    role: CreateUserBodyRole.PARTNER as string,
  });

  const [passwordError, setPasswordError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.passwordConfirm) {
      setPasswordError("Las contraseñas no coinciden");
      return;
    }
    setPasswordError("");

    try {
      const newUser = {
        fullName: formData.fullName,
        personalId: formData.personalId,
        number: Number(formData.number),
        email: formData.email,
        address: formData.address || undefined,
        phoneNumber: formData.phoneNumber || undefined,
        password: formData.password,
        role: formData.role as CreateUserBody["role"],
      } as CreateUserBody;

      const response = await createUser.mutateAsync({ data: newUser });
      if (response) {
        navigate("/partners");
      } else {
        errorDispatch("Ha habido un problema al crear el socio. Por favor, inténtalo más tarde");
      }
    } catch (e) {
      errorDispatch("Ha habido un problema al crear el socio. Por favor, inténtalo más tarde");
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2, sm: 3 },
        p: { xs: 0, sm: 2, md: 3 },
        minHeight: "100vh",
        background: "#f5f7fa",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Breadcrumb */}
      <Box sx={{ px: { xs: 2, sm: 0 }, width: "100%" }}>
        <BreadCrumb
          steps={[
            { label: "Inicio", href: "/" },
            { label: "Socios", href: "/partners" },
            { label: "Nuevo", href: "/partners/new" },
          ]}
        />
      </Box>

      {/* Header Section */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: { xs: 0, sm: 3 },
          background: "#667eea",
          color: "white",
          mx: { xs: 0, sm: 0 },
          width: { xs: "100%", sm: "auto" },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.2)",
              width: 56,
              height: 56,
            }}
          >
            <PersonIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Crear nuevo socio
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Registra un nuevo socio en la comunidad energética
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Form Section */}
      <Box sx={{ px: { xs: 2, sm: 0 }, width: "100%" }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: { xs: 2, sm: 3 },
            bgcolor: "white",
            boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)",
            width: { xs: "100%", sm: "auto" },
          }}
        >
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <TextField
                label="Nombre completo"
                variant="outlined"
                fullWidth
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                sx={fieldSx}
              />

              <TextField
                label="DNI/NIF"
                variant="outlined"
                fullWidth
                required
                value={formData.personalId}
                onChange={(e) => setFormData({ ...formData, personalId: e.target.value })}
                sx={fieldSx}
              />

              <TextField
                label="Número de socio"
                variant="outlined"
                fullWidth
                required
                type="number"
                inputProps={{ min: 0, step: 1 }}
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                sx={fieldSx}
              />

              <TextField
                label="Email"
                variant="outlined"
                fullWidth
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                sx={fieldSx}
              />

              <TextField
                label="Dirección"
                variant="outlined"
                fullWidth
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                sx={fieldSx}
              />

              <TextField
                label="Número de teléfono"
                variant="outlined"
                fullWidth
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                sx={fieldSx}
              />

              <TextField
                label="Contraseña"
                variant="outlined"
                fullWidth
                required
                type="password"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (passwordError) setPasswordError("");
                }}
                sx={fieldSx}
              />

              <TextField
                label="Confirmar contraseña"
                variant="outlined"
                fullWidth
                required
                type="password"
                value={formData.passwordConfirm}
                error={!!passwordError}
                helperText={passwordError}
                onChange={(e) => {
                  setFormData({ ...formData, passwordConfirm: e.target.value });
                  if (passwordError) setPasswordError("");
                }}
                sx={fieldSx}
              />

              <FormControl fullWidth required sx={fieldSx}>
                <InputLabel>Rol</InputLabel>
                <Select
                  label="Rol"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <MenuItem value={CreateUserBodyRole.PARTNER}>Socio</MenuItem>
                  <MenuItem value={CreateUserBodyRole.ADMIN}>Administrador</MenuItem>
                </Select>
                <FormHelperText> </FormHelperText>
              </FormControl>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={createUser.isPending}
                sx={{
                  mt: 2,
                  py: 1.5,
                  background: "#667eea",
                  textTransform: "none",
                  fontSize: "1rem",
                  fontWeight: 600,
                  "&:hover": {
                    background: "linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)",
                  },
                }}
              >
                {createUser.isPending ? <CircularProgress size={24} color="inherit" /> : "Crear socio"}
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
    </Box>
  );
};
