# Configuración de OKR Platform con Supabase

## Paso 1: Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta si no tienes una
2. Crea un nuevo proyecto
3. Espera a que el proyecto se inicialice (puede tomar unos minutos)

## Paso 2: Configurar las tablas de la base de datos

Ve a **SQL Editor** en el panel de Supabase y ejecuta el siguiente script:

```sql
-- Habilitar UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de organizaciones
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de usuarios (extiende auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de objetivos
CREATE TABLE objectives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  quarter TEXT NOT NULL CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
  year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'at_risk', 'cancelled')),
  owner TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de key results
CREATE TABLE key_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  objective_id UUID NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_value DECIMAL,
  target_value DECIMAL,
  unit TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_objectives_organization ON objectives(organization_id);
CREATE INDEX idx_objectives_quarter_year ON objectives(quarter, year);
CREATE INDEX idx_key_results_objective ON key_results(objective_id);
CREATE INDEX idx_users_organization ON users(organization_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para objectives
CREATE TRIGGER update_objectives_updated_at
  BEFORE UPDATE ON objectives
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;

-- Políticas para organizations
CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  USING (id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Anyone can create organization"
  ON organizations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update their organization"
  ON organizations FOR UPDATE
  USING (id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Políticas para users
CREATE POLICY "Users can view users in their organization"
  ON users FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- Políticas para objectives
CREATE POLICY "Users can view objectives in their organization"
  ON objectives FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create objectives in their organization"
  ON objectives FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update objectives in their organization"
  ON objectives FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can delete objectives in their organization"
  ON objectives FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Políticas para key_results
CREATE POLICY "Users can view key_results in their organization"
  ON key_results FOR SELECT
  USING (objective_id IN (
    SELECT id FROM objectives WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can create key_results in their organization"
  ON key_results FOR INSERT
  WITH CHECK (objective_id IN (
    SELECT id FROM objectives WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can update key_results in their organization"
  ON key_results FOR UPDATE
  USING (objective_id IN (
    SELECT id FROM objectives WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Admins can delete key_results in their organization"
  ON key_results FOR DELETE
  USING (objective_id IN (
    SELECT id FROM objectives WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  ));

-- Función para buscar organización por código de invitación
CREATE OR REPLACE FUNCTION get_organization_by_invite_code(code TEXT)
RETURNS TABLE (id UUID, name TEXT) AS $$
BEGIN
  RETURN QUERY SELECT o.id, o.name FROM organizations o WHERE o.invite_code = code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Paso 3: Configurar autenticación

1. Ve a **Authentication** > **Providers** en Supabase
2. Asegúrate de que **Email** esté habilitado
3. En **Authentication** > **URL Configuration**, configura:
   - Site URL: `http://localhost:5173` (para desarrollo)
   - Redirect URLs: `http://localhost:5173`

## Paso 4: Obtener credenciales

1. Ve a **Project Settings** > **API**
2. Copia:
   - **Project URL** (ej: `https://abcdefgh.supabase.co`)
   - **anon public** key

## Paso 5: Configurar variables de entorno

1. Copia el archivo de ejemplo:
   ```bash
   cp .env.example .env
   ```

2. Edita `.env` con tus credenciales:
   ```
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key
   ```

## Paso 6: Ejecutar la aplicación

```bash
npm install
npm run dev
```

## Uso de la aplicación

### Crear una organización
1. Ve a la página de registro
2. Completa el formulario y selecciona "Crear nueva organización"
3. Ingresa el nombre de tu organización
4. Serás el administrador de esta organización

### Unirse a una organización existente
1. Ve a la página de registro
2. Selecciona "Unirme con código de invitación"
3. Ingresa el código que te proporcionó el administrador
4. Completa tu registro

### Invitar usuarios
1. Como administrador, ve a tu perfil o configuración
2. Copia el código de invitación de tu organización
3. Compártelo con los usuarios que quieras invitar

## Roles

- **Admin**: Puede crear, editar y eliminar OKRs y Key Results
- **Member**: Puede crear y editar, pero no eliminar

## Troubleshooting

### Error de conexión a Supabase
- Verifica que las variables de entorno estén configuradas correctamente
- Asegúrate de que el proyecto de Supabase esté activo

### Error de permisos
- Verifica que las políticas RLS estén configuradas correctamente
- Asegúrate de estar logueado correctamente
