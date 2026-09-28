--
-- PostgreSQL database dump
--

\restrict FhqfePE8MypsC5gR0QQnZAfbifWdlr4b6sQt1ywAyQ9CPbQ8gOXTrEX7ZzOu8O0

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

-- Started on 2026-09-21 15:34:03

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 220 (class 1259 OID 16390)
-- Name: ciudad; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ciudad (
    id integer NOT NULL,
    codigo character varying(10) NOT NULL,
    nombre character varying(100) NOT NULL
);


ALTER TABLE public.ciudad OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16389)
-- Name: ciudad_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ciudad_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ciudad_id_seq OWNER TO postgres;

--
-- TOC entry 5175 (class 0 OID 0)
-- Dependencies: 219
-- Name: ciudad_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ciudad_id_seq OWNED BY public.ciudad.id;


--
-- TOC entry 236 (class 1259 OID 16517)
-- Name: cliente; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cliente (
    id integer NOT NULL,
    tipo character varying(10) NOT NULL,
    nombre character varying(150) NOT NULL,
    empresa_id integer,
    forma_pago character varying(50),
    observaciones_internas text,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT cliente_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['natural'::character varying, 'juridica'::character varying])::text[])))
);


ALTER TABLE public.cliente OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 16516)
-- Name: cliente_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cliente_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cliente_id_seq OWNER TO postgres;

--
-- TOC entry 5176 (class 0 OID 0)
-- Dependencies: 235
-- Name: cliente_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cliente_id_seq OWNED BY public.cliente.id;


--
-- TOC entry 242 (class 1259 OID 16576)
-- Name: concepto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.concepto (
    id integer NOT NULL,
    sitio_id integer NOT NULL,
    nombre character varying(120) NOT NULL,
    precio numeric(12,2) NOT NULL,
    impuesto_pct numeric(4,2) DEFAULT 0 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT concepto_precio_check CHECK ((precio >= (0)::numeric))
);


ALTER TABLE public.concepto OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 16575)
-- Name: concepto_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.concepto_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.concepto_id_seq OWNER TO postgres;

--
-- TOC entry 5177 (class 0 OID 0)
-- Dependencies: 241
-- Name: concepto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.concepto_id_seq OWNED BY public.concepto.id;


--
-- TOC entry 246 (class 1259 OID 16619)
-- Name: cotizacion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cotizacion (
    id integer NOT NULL,
    sitio_id integer NOT NULL,
    cliente_id integer NOT NULL,
    usuario_id integer NOT NULL,
    salon_id integer NOT NULL,
    montaje_id integer NOT NULL,
    estado character varying(20) DEFAULT 'cotizado'::character varying NOT NULL,
    fecha_evento date NOT NULL,
    validez_oferta date,
    cantidad_personas integer NOT NULL,
    bloqueo_hasta timestamp without time zone,
    garantia_tipo character varying(30),
    garantia_monto numeric(12,2),
    penalizacion_pct numeric(5,2),
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT cotizacion_cantidad_personas_check CHECK ((cantidad_personas > 0)),
    CONSTRAINT cotizacion_estado_check CHECK (((estado)::text = ANY ((ARRAY['cotizado'::character varying, 'bloqueado'::character varying, 'confirmado'::character varying, 'cancelado'::character varying])::text[])))
);


ALTER TABLE public.cotizacion OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 16618)
-- Name: cotizacion_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cotizacion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cotizacion_id_seq OWNER TO postgres;

--
-- TOC entry 5178 (class 0 OID 0)
-- Dependencies: 245
-- Name: cotizacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cotizacion_id_seq OWNED BY public.cotizacion.id;


--
-- TOC entry 248 (class 1259 OID 16666)
-- Name: cotizacion_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cotizacion_item (
    id integer NOT NULL,
    cotizacion_id integer NOT NULL,
    concepto_id integer NOT NULL,
    cantidad integer DEFAULT 1 NOT NULL,
    precio_unitario numeric(12,2) NOT NULL,
    CONSTRAINT cotizacion_item_cantidad_check CHECK ((cantidad > 0)),
    CONSTRAINT cotizacion_item_precio_unitario_check CHECK ((precio_unitario >= (0)::numeric))
);


ALTER TABLE public.cotizacion_item OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 16665)
-- Name: cotizacion_item_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cotizacion_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cotizacion_item_id_seq OWNER TO postgres;

--
-- TOC entry 5179 (class 0 OID 0)
-- Dependencies: 247
-- Name: cotizacion_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cotizacion_item_id_seq OWNED BY public.cotizacion_item.id;


--
-- TOC entry 230 (class 1259 OID 16456)
-- Name: empresa; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.empresa (
    id integer NOT NULL,
    razon_social character varying(150) NOT NULL,
    identificacion character varying(30) NOT NULL,
    contacto character varying(120),
    ciudad_id integer
);


ALTER TABLE public.empresa OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16455)
-- Name: empresa_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.empresa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.empresa_id_seq OWNER TO postgres;

--
-- TOC entry 5180 (class 0 OID 0)
-- Dependencies: 229
-- Name: empresa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.empresa_id_seq OWNED BY public.empresa.id;


--
-- TOC entry 226 (class 1259 OID 16425)
-- Name: montaje; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.montaje (
    id integer NOT NULL,
    codigo character varying(30) NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text
);


ALTER TABLE public.montaje OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16424)
-- Name: montaje_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.montaje_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.montaje_id_seq OWNER TO postgres;

--
-- TOC entry 5181 (class 0 OID 0)
-- Dependencies: 225
-- Name: montaje_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.montaje_id_seq OWNED BY public.montaje.id;


--
-- TOC entry 224 (class 1259 OID 16416)
-- Name: proveedor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.proveedor (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    identificacion character varying(30),
    contacto character varying(120)
);


ALTER TABLE public.proveedor OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16415)
-- Name: proveedor_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.proveedor_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.proveedor_id_seq OWNER TO postgres;

--
-- TOC entry 5182 (class 0 OID 0)
-- Dependencies: 223
-- Name: proveedor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.proveedor_id_seq OWNED BY public.proveedor.id;


--
-- TOC entry 222 (class 1259 OID 16402)
-- Name: rol; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rol (
    id integer NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text
);


ALTER TABLE public.rol OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16401)
-- Name: rol_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rol_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rol_id_seq OWNER TO postgres;

--
-- TOC entry 5183 (class 0 OID 0)
-- Dependencies: 221
-- Name: rol_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rol_id_seq OWNED BY public.rol.id;


--
-- TOC entry 238 (class 1259 OID 16537)
-- Name: salon; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.salon (
    id integer NOT NULL,
    sitio_id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    altura numeric(5,2),
    ancho numeric(5,2)
);


ALTER TABLE public.salon OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 16536)
-- Name: salon_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.salon_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.salon_id_seq OWNER TO postgres;

--
-- TOC entry 5184 (class 0 OID 0)
-- Dependencies: 237
-- Name: salon_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.salon_id_seq OWNED BY public.salon.id;


--
-- TOC entry 240 (class 1259 OID 16552)
-- Name: salon_montaje; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.salon_montaje (
    id integer NOT NULL,
    salon_id integer NOT NULL,
    montaje_id integer NOT NULL,
    aforo integer NOT NULL,
    foto_url character varying(200),
    CONSTRAINT salon_montaje_aforo_check CHECK ((aforo >= 0))
);


ALTER TABLE public.salon_montaje OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 16551)
-- Name: salon_montaje_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.salon_montaje_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.salon_montaje_id_seq OWNER TO postgres;

--
-- TOC entry 5185 (class 0 OID 0)
-- Dependencies: 239
-- Name: salon_montaje_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.salon_montaje_id_seq OWNED BY public.salon_montaje.id;


--
-- TOC entry 228 (class 1259 OID 16439)
-- Name: sitio; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sitio (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    ciudad_id integer NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sitio OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16438)
-- Name: sitio_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sitio_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sitio_id_seq OWNER TO postgres;

--
-- TOC entry 5186 (class 0 OID 0)
-- Dependencies: 227
-- Name: sitio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sitio_id_seq OWNED BY public.sitio.id;


--
-- TOC entry 244 (class 1259 OID 16597)
-- Name: stock_elemento; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_elemento (
    id integer NOT NULL,
    proveedor_id integer NOT NULL,
    nombre_elemento character varying(120) NOT NULL,
    cantidad integer DEFAULT 0 NOT NULL,
    valor numeric(12,2) NOT NULL,
    actualizado_en timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT stock_elemento_cantidad_check CHECK ((cantidad >= 0)),
    CONSTRAINT stock_elemento_valor_check CHECK ((valor >= (0)::numeric))
);


ALTER TABLE public.stock_elemento OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 16596)
-- Name: stock_elemento_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stock_elemento_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stock_elemento_id_seq OWNER TO postgres;

--
-- TOC entry 5187 (class 0 OID 0)
-- Dependencies: 243
-- Name: stock_elemento_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stock_elemento_id_seq OWNED BY public.stock_elemento.id;


--
-- TOC entry 232 (class 1259 OID 16473)
-- Name: usuario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuario (
    id integer NOT NULL,
    username character varying(150) NOT NULL,
    password character varying(128) NOT NULL,
    email character varying(254),
    is_active boolean DEFAULT true NOT NULL,
    rol_id integer NOT NULL
);


ALTER TABLE public.usuario OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16472)
-- Name: usuario_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuario_id_seq OWNER TO postgres;

--
-- TOC entry 5188 (class 0 OID 0)
-- Dependencies: 231
-- Name: usuario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuario_id_seq OWNED BY public.usuario.id;


--
-- TOC entry 234 (class 1259 OID 16495)
-- Name: usuario_sitio; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuario_sitio (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    sitio_id integer NOT NULL
);


ALTER TABLE public.usuario_sitio OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 16494)
-- Name: usuario_sitio_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuario_sitio_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuario_sitio_id_seq OWNER TO postgres;

--
-- TOC entry 5189 (class 0 OID 0)
-- Dependencies: 233
-- Name: usuario_sitio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuario_sitio_id_seq OWNED BY public.usuario_sitio.id;


--
-- TOC entry 4926 (class 2604 OID 16393)
-- Name: ciudad id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ciudad ALTER COLUMN id SET DEFAULT nextval('public.ciudad_id_seq'::regclass);


--
-- TOC entry 4936 (class 2604 OID 16520)
-- Name: cliente id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cliente ALTER COLUMN id SET DEFAULT nextval('public.cliente_id_seq'::regclass);


--
-- TOC entry 4940 (class 2604 OID 16579)
-- Name: concepto id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.concepto ALTER COLUMN id SET DEFAULT nextval('public.concepto_id_seq'::regclass);


--
-- TOC entry 4946 (class 2604 OID 16622)
-- Name: cotizacion id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizacion ALTER COLUMN id SET DEFAULT nextval('public.cotizacion_id_seq'::regclass);


--
-- TOC entry 4949 (class 2604 OID 16669)
-- Name: cotizacion_item id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizacion_item ALTER COLUMN id SET DEFAULT nextval('public.cotizacion_item_id_seq'::regclass);


--
-- TOC entry 4932 (class 2604 OID 16459)
-- Name: empresa id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresa ALTER COLUMN id SET DEFAULT nextval('public.empresa_id_seq'::regclass);


--
-- TOC entry 4929 (class 2604 OID 16428)
-- Name: montaje id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.montaje ALTER COLUMN id SET DEFAULT nextval('public.montaje_id_seq'::regclass);


--
-- TOC entry 4928 (class 2604 OID 16419)
-- Name: proveedor id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proveedor ALTER COLUMN id SET DEFAULT nextval('public.proveedor_id_seq'::regclass);


--
-- TOC entry 4927 (class 2604 OID 16405)
-- Name: rol id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rol ALTER COLUMN id SET DEFAULT nextval('public.rol_id_seq'::regclass);


--
-- TOC entry 4938 (class 2604 OID 16540)
-- Name: salon id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salon ALTER COLUMN id SET DEFAULT nextval('public.salon_id_seq'::regclass);


--
-- TOC entry 4939 (class 2604 OID 16555)
-- Name: salon_montaje id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salon_montaje ALTER COLUMN id SET DEFAULT nextval('public.salon_montaje_id_seq'::regclass);


--
-- TOC entry 4930 (class 2604 OID 16442)
-- Name: sitio id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sitio ALTER COLUMN id SET DEFAULT nextval('public.sitio_id_seq'::regclass);


--
-- TOC entry 4943 (class 2604 OID 16600)
-- Name: stock_elemento id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_elemento ALTER COLUMN id SET DEFAULT nextval('public.stock_elemento_id_seq'::regclass);


--
-- TOC entry 4933 (class 2604 OID 16476)
-- Name: usuario id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario ALTER COLUMN id SET DEFAULT nextval('public.usuario_id_seq'::regclass);


--
-- TOC entry 4935 (class 2604 OID 16498)
-- Name: usuario_sitio id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_sitio ALTER COLUMN id SET DEFAULT nextval('public.usuario_sitio_id_seq'::regclass);


--
-- TOC entry 4961 (class 2606 OID 16400)
-- Name: ciudad ciudad_codigo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ciudad
    ADD CONSTRAINT ciudad_codigo_key UNIQUE (codigo);


--
-- TOC entry 4963 (class 2606 OID 16398)
-- Name: ciudad ciudad_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ciudad
    ADD CONSTRAINT ciudad_pkey PRIMARY KEY (id);


--
-- TOC entry 4989 (class 2606 OID 16530)
-- Name: cliente cliente_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cliente
    ADD CONSTRAINT cliente_pkey PRIMARY KEY (id);


--
-- TOC entry 4997 (class 2606 OID 16590)
-- Name: concepto concepto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.concepto
    ADD CONSTRAINT concepto_pkey PRIMARY KEY (id);


--
-- TOC entry 5004 (class 2606 OID 16679)
-- Name: cotizacion_item cotizacion_item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizacion_item
    ADD CONSTRAINT cotizacion_item_pkey PRIMARY KEY (id);


--
-- TOC entry 5001 (class 2606 OID 16638)
-- Name: cotizacion cotizacion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizacion
    ADD CONSTRAINT cotizacion_pkey PRIMARY KEY (id);


--
-- TOC entry 4977 (class 2606 OID 16466)
-- Name: empresa empresa_identificacion_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresa
    ADD CONSTRAINT empresa_identificacion_key UNIQUE (identificacion);


--
-- TOC entry 4979 (class 2606 OID 16464)
-- Name: empresa empresa_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresa
    ADD CONSTRAINT empresa_pkey PRIMARY KEY (id);


--
-- TOC entry 4971 (class 2606 OID 16437)
-- Name: montaje montaje_codigo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.montaje
    ADD CONSTRAINT montaje_codigo_key UNIQUE (codigo);


--
-- TOC entry 4973 (class 2606 OID 16435)
-- Name: montaje montaje_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.montaje
    ADD CONSTRAINT montaje_pkey PRIMARY KEY (id);


--
-- TOC entry 4969 (class 2606 OID 16423)
-- Name: proveedor proveedor_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proveedor
    ADD CONSTRAINT proveedor_pkey PRIMARY KEY (id);


--
-- TOC entry 4965 (class 2606 OID 16414)
-- Name: rol rol_codigo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rol
    ADD CONSTRAINT rol_codigo_key UNIQUE (codigo);


--
-- TOC entry 4967 (class 2606 OID 16412)
-- Name: rol rol_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rol
    ADD CONSTRAINT rol_pkey PRIMARY KEY (id);


--
-- TOC entry 4993 (class 2606 OID 16562)
-- Name: salon_montaje salon_montaje_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salon_montaje
    ADD CONSTRAINT salon_montaje_pkey PRIMARY KEY (id);


--
-- TOC entry 4995 (class 2606 OID 16564)
-- Name: salon_montaje salon_montaje_salon_id_montaje_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salon_montaje
    ADD CONSTRAINT salon_montaje_salon_id_montaje_id_key UNIQUE (salon_id, montaje_id);


--
-- TOC entry 4991 (class 2606 OID 16545)
-- Name: salon salon_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salon
    ADD CONSTRAINT salon_pkey PRIMARY KEY (id);


--
-- TOC entry 4975 (class 2606 OID 16449)
-- Name: sitio sitio_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sitio
    ADD CONSTRAINT sitio_pkey PRIMARY KEY (id);


--
-- TOC entry 4999 (class 2606 OID 16612)
-- Name: stock_elemento stock_elemento_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_elemento
    ADD CONSTRAINT stock_elemento_pkey PRIMARY KEY (id);


--
-- TOC entry 4981 (class 2606 OID 16486)
-- Name: usuario usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (id);


--
-- TOC entry 4985 (class 2606 OID 16503)
-- Name: usuario_sitio usuario_sitio_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_sitio
    ADD CONSTRAINT usuario_sitio_pkey PRIMARY KEY (id);


--
-- TOC entry 4987 (class 2606 OID 16505)
-- Name: usuario_sitio usuario_sitio_usuario_id_sitio_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_sitio
    ADD CONSTRAINT usuario_sitio_usuario_id_sitio_id_key UNIQUE (usuario_id, sitio_id);


--
-- TOC entry 4983 (class 2606 OID 16488)
-- Name: usuario usuario_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_username_key UNIQUE (username);


--
-- TOC entry 5002 (class 1259 OID 16664)
-- Name: uq_salon_fecha_confirmado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_salon_fecha_confirmado ON public.cotizacion USING btree (salon_id, fecha_evento) WHERE ((estado)::text = 'confirmado'::text);


--
-- TOC entry 5010 (class 2606 OID 16531)
-- Name: cliente cliente_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cliente
    ADD CONSTRAINT cliente_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresa(id) ON DELETE RESTRICT;


--
-- TOC entry 5014 (class 2606 OID 16591)
-- Name: concepto concepto_sitio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.concepto
    ADD CONSTRAINT concepto_sitio_id_fkey FOREIGN KEY (sitio_id) REFERENCES public.sitio(id) ON DELETE CASCADE;


--
-- TOC entry 5016 (class 2606 OID 16644)
-- Name: cotizacion cotizacion_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizacion
    ADD CONSTRAINT cotizacion_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.cliente(id) ON DELETE RESTRICT;


--
-- TOC entry 5021 (class 2606 OID 16685)
-- Name: cotizacion_item cotizacion_item_concepto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizacion_item
    ADD CONSTRAINT cotizacion_item_concepto_id_fkey FOREIGN KEY (concepto_id) REFERENCES public.concepto(id) ON DELETE RESTRICT;


--
-- TOC entry 5022 (class 2606 OID 16680)
-- Name: cotizacion_item cotizacion_item_cotizacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizacion_item
    ADD CONSTRAINT cotizacion_item_cotizacion_id_fkey FOREIGN KEY (cotizacion_id) REFERENCES public.cotizacion(id) ON DELETE CASCADE;


--
-- TOC entry 5017 (class 2606 OID 16659)
-- Name: cotizacion cotizacion_montaje_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizacion
    ADD CONSTRAINT cotizacion_montaje_id_fkey FOREIGN KEY (montaje_id) REFERENCES public.montaje(id) ON DELETE RESTRICT;


--
-- TOC entry 5018 (class 2606 OID 16654)
-- Name: cotizacion cotizacion_salon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizacion
    ADD CONSTRAINT cotizacion_salon_id_fkey FOREIGN KEY (salon_id) REFERENCES public.salon(id) ON DELETE RESTRICT;


--
-- TOC entry 5019 (class 2606 OID 16639)
-- Name: cotizacion cotizacion_sitio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizacion
    ADD CONSTRAINT cotizacion_sitio_id_fkey FOREIGN KEY (sitio_id) REFERENCES public.sitio(id) ON DELETE CASCADE;


--
-- TOC entry 5020 (class 2606 OID 16649)
-- Name: cotizacion cotizacion_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizacion
    ADD CONSTRAINT cotizacion_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE RESTRICT;


--
-- TOC entry 5006 (class 2606 OID 16467)
-- Name: empresa empresa_ciudad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresa
    ADD CONSTRAINT empresa_ciudad_id_fkey FOREIGN KEY (ciudad_id) REFERENCES public.ciudad(id) ON DELETE SET NULL;


--
-- TOC entry 5012 (class 2606 OID 16570)
-- Name: salon_montaje salon_montaje_montaje_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salon_montaje
    ADD CONSTRAINT salon_montaje_montaje_id_fkey FOREIGN KEY (montaje_id) REFERENCES public.montaje(id) ON DELETE RESTRICT;


--
-- TOC entry 5013 (class 2606 OID 16565)
-- Name: salon_montaje salon_montaje_salon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salon_montaje
    ADD CONSTRAINT salon_montaje_salon_id_fkey FOREIGN KEY (salon_id) REFERENCES public.salon(id) ON DELETE CASCADE;


--
-- TOC entry 5011 (class 2606 OID 16546)
-- Name: salon salon_sitio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salon
    ADD CONSTRAINT salon_sitio_id_fkey FOREIGN KEY (sitio_id) REFERENCES public.sitio(id) ON DELETE CASCADE;


--
-- TOC entry 5005 (class 2606 OID 16450)
-- Name: sitio sitio_ciudad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sitio
    ADD CONSTRAINT sitio_ciudad_id_fkey FOREIGN KEY (ciudad_id) REFERENCES public.ciudad(id) ON DELETE RESTRICT;


--
-- TOC entry 5015 (class 2606 OID 16613)
-- Name: stock_elemento stock_elemento_proveedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_elemento
    ADD CONSTRAINT stock_elemento_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES public.proveedor(id) ON DELETE CASCADE;


--
-- TOC entry 5007 (class 2606 OID 16489)
-- Name: usuario usuario_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.rol(id) ON DELETE RESTRICT;


--
-- TOC entry 5008 (class 2606 OID 16511)
-- Name: usuario_sitio usuario_sitio_sitio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_sitio
    ADD CONSTRAINT usuario_sitio_sitio_id_fkey FOREIGN KEY (sitio_id) REFERENCES public.sitio(id) ON DELETE CASCADE;


--
-- TOC entry 5009 (class 2606 OID 16506)
-- Name: usuario_sitio usuario_sitio_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_sitio
    ADD CONSTRAINT usuario_sitio_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE CASCADE;


-- Completed on 2026-09-21 15:34:03

--
-- PostgreSQL database dump complete
--

\unrestrict FhqfePE8MypsC5gR0QQnZAfbifWdlr4b6sQt1ywAyQ9CPbQ8gOXTrEX7ZzOu8O0

