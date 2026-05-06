import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useParams, useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
import Sidebar from "../components/Sidebar";
import AddLeadDialog from "../components/leads/AddLeadDialog";
import ViewLeadDialog from "../components/leads/ViewLeadDialog";
import {
  funnelService,
  leadService,
  workspaceService,
  type CreateLeadPayload,
  type Funnel,
  type Lead,
  type Workspace,
} from "../services/api";

interface ApiError {
  error: string;
}

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [funnelsLoading, setFunnelsLoading] = useState(true);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editingFunnelId, setEditingFunnelId] = useState<string | null>(null);
  const [editingFunnelName, setEditingFunnelName] = useState("");
  const [draggingLead, setDraggingLead] = useState<Lead | null>(null);
  const [dragOverFunnelId, setDragOverFunnelId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [createLeadLoading, setCreateLeadLoading] = useState(false);
  const [createLeadError, setCreateLeadError] = useState("");
  const [deleteLeadLoading, setDeleteLeadLoading] = useState(false);
  const [deleteLeadError, setDeleteLeadError] = useState("");
  const [toast, setToast] = useState("");
  const [toastSeverity, setToastSeverity] = useState<"success" | "error">(
    "success",
  );
  const kanbanScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const scrollSpeedRef = useRef(0);

  const editingLeadPayload = useMemo(
    () => (editingLead ? getLeadPayload(editingLead) : null),
    [editingLead],
  );

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    workspaceService
      .getById(id)
      .then((res) => setWorkspace(res.data))
      .catch(() => navigate("/"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    if (!id) return;
    setLeadsLoading(true);
    leadService
      .list(id)
      .then((res) => setLeads(res.data))
      .catch(() => setLeads([]))
      .finally(() => setLeadsLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setFunnelsLoading(true);
    funnelService
      .list(id)
      .then((res) => setFunnels(res.data))
      .catch(() => setFunnels([]))
      .finally(() => setFunnelsLoading(false));
  }, [id]);

  useEffect(() => () => stopKanbanAutoScroll(), []);

  function showSuccess(message: string) {
    setToastSeverity("success");
    setToast(message);
  }

  function showError(message: string) {
    setToastSeverity("error");
    setToast(message);
  }

  async function handleCreateLead(payload: CreateLeadPayload) {
    if (!id) return;
    setCreateLeadLoading(true);
    setCreateLeadError("");

    try {
      const res = await leadService.create(id, payload);
      setLeads((current) => [res.data, ...current]);
      setAddLeadOpen(false);
      showSuccess("Lead cadastrado com sucesso.");
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setCreateLeadError(
        axiosErr.response?.data?.error ||
          "Não foi possível cadastrar o lead. Revise os dados e tente novamente.",
      );
    } finally {
      setCreateLeadLoading(false);
    }
  }

  async function handleUpdateLead(payload: CreateLeadPayload) {
    if (!id || !editingLead) return;
    setCreateLeadLoading(true);
    setCreateLeadError("");

    try {
      const res = await leadService.update(id, editingLead.id, payload);
      setLeads((current) =>
        current.map((lead) => (lead.id === res.data.id ? res.data : lead)),
      );
      setEditingLead(null);
      setSelectedLead(res.data);
      showSuccess("Lead atualizado com sucesso.");
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setCreateLeadError(
        axiosErr.response?.data?.error ||
          "Não foi possível atualizar o lead. Revise os dados e tente novamente.",
      );
    } finally {
      setCreateLeadLoading(false);
    }
  }

  async function handleDeleteLead() {
    if (!id || !selectedLead) return;
    setDeleteLeadLoading(true);
    setDeleteLeadError("");

    try {
      await leadService.remove(id, selectedLead.id);
      setLeads((current) =>
        current.filter((lead) => lead.id !== selectedLead.id),
      );
      setSelectedLead(null);
      setDeleteConfirmOpen(false);
      showSuccess("Lead excluído com sucesso.");
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setDeleteLeadError(
        axiosErr.response?.data?.error ||
          "Não foi possível excluir o lead. Tente novamente.",
      );
    } finally {
      setDeleteLeadLoading(false);
    }
  }

  async function handleAddFunnel() {
    if (!id) return;

    try {
      const res = await funnelService.create(id);
      setFunnels((current) => [...current, res.data]);
      setEditingFunnelId(res.data.id);
      setEditingFunnelName(res.data.name);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      showError(
        axiosErr.response?.data?.error ||
          "Não foi possível adicionar a etapa de funil.",
      );
    }
  }

  function startEditingFunnel(funnel: Funnel) {
    setEditingFunnelId(funnel.id);
    setEditingFunnelName(funnel.name);
  }

  async function saveFunnelName(funnel: Funnel) {
    if (!id || editingFunnelId !== funnel.id) return;

    const nextName = editingFunnelName.trim() || funnel.name;
    setEditingFunnelId(null);
    setEditingFunnelName("");

    if (nextName === funnel.name) return;

    const previousFunnels = funnels;
    setFunnels((current) =>
      current.map((item) =>
        item.id === funnel.id ? { ...item, name: nextName } : item,
      ),
    );

    try {
      const res = await funnelService.update(id, funnel.id, nextName);
      setFunnels((current) =>
        current.map((item) => (item.id === funnel.id ? res.data : item)),
      );
    } catch (err) {
      setFunnels(previousFunnels);
      const axiosErr = err as AxiosError<ApiError>;
      showError(
        axiosErr.response?.data?.error || "Não foi possível renomear o funil.",
      );
    }
  }

  async function handleDeleteFunnel(funnel: Funnel) {
    if (!id) return;

    try {
      await funnelService.remove(id, funnel.id);
      setFunnels((current) => current.filter((item) => item.id !== funnel.id));
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      showError(
        axiosErr.response?.data?.error || "Não foi possível excluir o funil.",
      );
    }
  }

  function handleDragStart(lead: Lead, event: DragEvent<HTMLDivElement>) {
    setDraggingLead(lead);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", lead.id);
  }

  function handleDragOver(funnelId: string, event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverFunnelId(funnelId);
    updateKanbanAutoScroll(event.clientX);
  }

  async function handleDrop(targetFunnelId: string) {
    if (!id || !draggingLead) return;

    stopKanbanAutoScroll();
    setDragOverFunnelId(null);
    const lead = draggingLead;
    setDraggingLead(null);

    if (lead.funnelId === targetFunnelId) return;

    const previousLeads = leads;
    setLeads((current) =>
      current.map((item) =>
        item.id === lead.id ? { ...item, funnelId: targetFunnelId } : item,
      ),
    );

    try {
      const res = await leadService.moveToFunnel(id, lead.id, targetFunnelId);
      setLeads((current) =>
        current.map((item) => (item.id === lead.id ? res.data : item)),
      );
      setSelectedLead((current) =>
        current?.id === lead.id ? res.data : current,
      );
    } catch (err) {
      setLeads(previousLeads);
      const axiosErr = err as AxiosError<ApiError>;
      showError(
        axiosErr.response?.data?.error || "Não foi possível mover o lead.",
      );
    }
  }

  function updateKanbanAutoScroll(pointerX: number) {
    const container = kanbanScrollRef.current;
    if (!container) return;

    const bounds = container.getBoundingClientRect();
    const edgeSize = Math.min(180, bounds.width * 0.28);
    const distanceFromLeft = pointerX - bounds.left;
    const distanceFromRight = bounds.right - pointerX;
    let nextSpeed = 0;

    if (distanceFromLeft < edgeSize) {
      nextSpeed = -calculateAutoScrollSpeed(edgeSize - distanceFromLeft, edgeSize);
    } else if (distanceFromRight < edgeSize) {
      nextSpeed = calculateAutoScrollSpeed(edgeSize - distanceFromRight, edgeSize);
    }

    scrollSpeedRef.current = nextSpeed;

    if (nextSpeed === 0) {
      stopKanbanAutoScroll();
      return;
    }

    if (scrollFrameRef.current === null) {
      scrollFrameRef.current = window.requestAnimationFrame(scrollKanban);
    }
  }

  function calculateAutoScrollSpeed(distanceInsideEdge: number, edgeSize: number) {
    const intensity = Math.min(1, Math.max(0, distanceInsideEdge / edgeSize));
    return 12 + intensity * 34;
  }

  function scrollKanban() {
    const container = kanbanScrollRef.current;
    const speed = scrollSpeedRef.current;

    if (!container || speed === 0) {
      scrollFrameRef.current = null;
      return;
    }

    container.scrollLeft += speed;
    scrollFrameRef.current = window.requestAnimationFrame(scrollKanban);
  }

  function stopKanbanAutoScroll() {
    scrollSpeedRef.current = 0;

    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current);
      scrollFrameRef.current = null;
    }
  }

  function getLeadPayload(lead: Lead): CreateLeadPayload {
    return {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      role: lead.role,
      source: lead.source,
      notes: lead.notes,
      customFields: lead.customFields,
    };
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <Box
        sx={{
          flex: 1,
          p: { xs: 3, md: 5 },
          bgcolor: "background.default",
          minWidth: 0,
        }}
      >
        {loading ? (
          <Box
            sx={{
              display: "flex",
              minHeight: "60vh",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <Box
            sx={{
              maxWidth: "100%",
              mx: "auto",
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: { xs: "stretch", sm: "center" },
                justifyContent: "space-between",
                gap: 2,
                flexDirection: { xs: "column", sm: "row" },
                mb: 3,
              }}
            >
              <Box>
                <Typography variant="h4" color="text.primary">
                  {workspace?.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Organize os leads pelo funil deste workspace
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddLeadOpen(true)}
              >
                Adicionar Lead
              </Button>
            </Box>

            {leadsLoading || funnelsLoading ? (
              <Box sx={{ display: "flex", py: 8, justifyContent: "center" }}>
                <CircularProgress size={28} />
              </Box>
            ) : funnels.length > 0 ? (
              <Box
                ref={kanbanScrollRef}
                data-testid="kanban-scroll"
                onDragOver={(event) => updateKanbanAutoScroll(event.clientX)}
                onDragLeave={(event) => {
                  if (event.currentTarget === event.target) {
                    stopKanbanAutoScroll();
                  }
                }}
                sx={{
                  display: "flex",
                  alignItems: "stretch",
                  gap: 2,
                  overflowX: "auto",
                  overscrollBehaviorX: "contain",
                  scrollBehavior: draggingLead ? "auto" : "smooth",
                  pb: 2,
                  flex: 1,
                }}
              >
                {funnels.map((funnel) => {
                  const funnelLeads = leads.filter(
                    (lead) => lead.funnelId === funnel.id,
                  );
                  const hasLeads = funnelLeads.length > 0;
                  const isEditing = editingFunnelId === funnel.id;

                  return (
                    <Box
                      key={funnel.id}
                      onDragOver={(event) => handleDragOver(funnel.id, event)}
                      onDragLeave={() =>
                        setDragOverFunnelId((current) =>
                          current === funnel.id ? null : current,
                        )
                      }
                      onDrop={() => handleDrop(funnel.id)}
                      sx={{
                        flex: "0 0 300px",
                        minHeight: "62vh",
                        bgcolor:
                          dragOverFunnelId === funnel.id
                            ? "rgba(37, 99, 235, 0.08)"
                            : "background.paper",
                        border: 1,
                        borderColor:
                          dragOverFunnelId === funnel.id
                            ? "secondary.main"
                            : "divider",
                        borderRadius: 1,
                        display: "flex",
                        flexDirection: "column",
                        transition:
                          "background-color 120ms ease, border-color 120ms ease",
                      }}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        gap={1}
                        sx={{ p: 1.5, pb: 1 }}
                      >
                        {isEditing ? (
                          <TextField
                            value={editingFunnelName}
                            autoFocus
                            onFocus={(event) => event.target.select()}
                            onChange={(event) =>
                              setEditingFunnelName(event.target.value)
                            }
                            onBlur={() => saveFunnelName(funnel)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter")
                                event.currentTarget.blur();
                              if (event.key === "Escape") {
                                setEditingFunnelId(null);
                                setEditingFunnelName("");
                              }
                            }}
                            fullWidth
                            size="small"
                          />
                        ) : (
                          <Button
                            variant="text"
                            onClick={() => startEditingFunnel(funnel)}
                            sx={{
                              justifyContent: "flex-start",
                              minWidth: 0,
                              px: 0.5,
                              color: "text.primary",
                              fontWeight: 700,
                              textAlign: "left",
                            }}
                          >
                            <Typography
                              noWrap
                              variant="subtitle1"
                              component="span"
                              sx={{ fontWeight: 700 }}
                            >
                              {funnel.name}
                            </Typography>
                          </Button>
                        )}

                        <Tooltip
                          title={
                            hasLeads
                              ? "Esvazie o funil antes de excluí-lo"
                              : "Excluir funil"
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              aria-label="Excluir funil"
                              disabled={hasLeads}
                              onClick={() => handleDeleteFunnel(funnel)}
                              sx={{ opacity: hasLeads ? 0.35 : 0.7 }}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ px: 2, pb: 1 }}
                      >
                        {funnelLeads.length}{" "}
                        {funnelLeads.length === 1 ? "lead" : "leads"}
                      </Typography>

                      <Stack spacing={1.25} sx={{ p: 1.5, pt: 0, flex: 1 }}>
                        {funnelLeads.map((lead) => (
                          <Card
                            key={lead.id}
                            draggable
                            onDragStart={(event) =>
                              handleDragStart(lead, event)
                            }
                            onDragEnd={() => {
                              stopKanbanAutoScroll();
                              setDraggingLead(null);
                              setDragOverFunnelId(null);
                            }}
                            sx={{
                              border: 1,
                              borderColor: "divider",
                              boxShadow: "none",
                              cursor: "grab",
                              opacity: draggingLead?.id === lead.id ? 0.55 : 1,
                            }}
                          >
                            <CardActionArea
                              onClick={() => setSelectedLead(lead)}
                            >
                              <CardContent
                                sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  color="text.primary"
                                  sx={{ fontWeight: 700, lineHeight: 1.25 }}
                                >
                                  {lead.name}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ mt: 0.25 }}
                                >
                                  {lead.role} - {lead.company}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ display: "block", mt: 0.75 }}
                                >
                                  {lead.source}
                                </Typography>
                              </CardContent>
                            </CardActionArea>
                          </Card>
                        ))}
                      </Stack>
                    </Box>
                  );
                })}

                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddFunnel}
                  sx={{
                    flex: "0 0 240px",
                    height: 44,
                    alignSelf: "flex-start",
                    borderStyle: "dashed",
                    bgcolor: "background.paper",
                  }}
                >
                  Adicionar etapa de funil
                </Button>
              </Box>
            ) : (
              <Box
                sx={{
                  bgcolor: "background.paper",
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  px: 3,
                  py: 5,
                  textAlign: "center",
                }}
              >
                <Typography variant="h6">Nenhum funil cadastrado</Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  Adicione uma etapa de funil para começar a organizar os
                  contatos deste workspace.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddFunnel}
                  sx={{ mt: 2 }}
                >
                  Adicionar etapa de funil
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Box>

      <AddLeadDialog
        key={
          editingLead
            ? `edit-lead-${editingLead.id}`
            : addLeadOpen
              ? "add-lead-open"
              : "add-lead-closed"
        }
        open={addLeadOpen || Boolean(editingLead)}
        loading={createLeadLoading}
        error={createLeadError}
        title={
          editingLead ? `Editando lead ${editingLead.name}` : "Adicionar lead"
        }
        initialLead={editingLeadPayload}
        onClose={() => {
          setCreateLeadError("");
          if (editingLead) {
            setEditingLead(null);
          } else {
            setAddLeadOpen(false);
          }
        }}
        onSubmit={editingLead ? handleUpdateLead : handleCreateLead}
      />
      <ViewLeadDialog
        open={Boolean(selectedLead) && !editingLead && !deleteConfirmOpen}
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onEdit={() => {
          if (selectedLead) setEditingLead(selectedLead);
        }}
        onDelete={() => {
          setDeleteLeadError("");
          setDeleteConfirmOpen(true);
        }}
      />
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => !deleteLeadLoading && setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Excluir lead</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja excluir {selectedLead?.name}? Esta ação não
            pode ser desfeita.
          </DialogContentText>
          {deleteLeadError && (
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              {deleteLeadError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteConfirmOpen(false)}
            disabled={deleteLeadLoading}
          >
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteLead}
            disabled={deleteLeadLoading}
            startIcon={
              deleteLeadLoading ? (
                <CircularProgress size={16} color="inherit" />
              ) : null
            }
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast("")}
      >
        <Alert
          severity={toastSeverity}
          variant="filled"
          onClose={() => setToast("")}
        >
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
