import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider.jsx";
import Loading from "../components/Loading.jsx";
import Modal from "../components/Modal.jsx";
import { useToast } from "../components/ToastProvider.jsx";
import useOnlineStatus from "../hooks/useOnlineStatus.js";
import useLoadingToast from "../hooks/useLoadingToast.js";
import { getClient, getClients } from "../services/clientService.js";
import { getSectionLoadingMessage } from "../utils/loadingMessages.js";
import {
  createCompany,
  deleteCompany,
  getCompanies,
  updateCompany,
} from "../services/companyService.js";

const emptyCompanyForm = {
  companyName: "",
  address: "",
};

export default function CompaniesPage() {
  const {
    userProfile,
    profileLoading,
    isSuperAdmin,
    isClientAdmin,
  } = useAuth();
  const { showToast } = useToast();
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [companies, setCompanies] = useState([]);
  const [companyForm, setCompanyForm] = useState(emptyCompanyForm);
  const [isCompanyFormOpen, setIsCompanyFormOpen] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState("");
  const [clientsLoading, setClientsLoading] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [deletingCompanyId, setDeletingCompanyId] = useState("");
  const companiesLoadingMessage = useMemo(() => {
    if (profileLoading) return "Loading companies...";
    return getSectionLoadingMessage([
      ["clients", clientsLoading],
      ["companies", companiesLoading],
    ]);
  }, [clientsLoading, companiesLoading, profileLoading]);

  useLoadingToast(Boolean(companiesLoadingMessage), companiesLoadingMessage, {
    variant: "loading",
    id: "companies-page-loading",
    persist: true,
  });
  const canManageCompanies = isSuperAdmin || isClientAdmin;
  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId),
    [clients, selectedClientId]
  );

  useEffect(() => {
    if (profileLoading) return;

    const loadClients = async () => {
      setClientsLoading(true);
      try {
        if (isSuperAdmin) {
          const clientRecords = await getClients();
          setClients(clientRecords);
          setSelectedClientId((current) => current || clientRecords[0]?.id || "");
          return;
        }

        if (userProfile?.clientId) {
          const client = await getClient(userProfile.clientId);
          setClients(client ? [client] : []);
          setSelectedClientId(userProfile.clientId);
          return;
        }

        setClients([]);
        setSelectedClientId("");
      } catch (loadError) {
        console.error(loadError);
        showToast("Could not load clients.", { variant: "error" });
      } finally {
        setClientsLoading(false);
      }
    };

    loadClients();
  }, [profileLoading, isSuperAdmin, userProfile]);

  const loadCompanies = async (clientId = selectedClientId) => {
    if (!clientId) {
      setCompanies([]);
      return;
    }

    setCompaniesLoading(true);
    try {
      setCompanies(await getCompanies(clientId));
    } catch (loadError) {
      console.error(loadError);
      showToast("Could not load companies.", { variant: "error" });
    } finally {
      setCompaniesLoading(false);
    }
  };

  useEffect(() => {
    if (profileLoading) return;
    resetCompanyForm();
    loadCompanies(selectedClientId);
  }, [profileLoading, selectedClientId]);

  const updateCompanyFormField = (field, value) => {
    setCompanyForm((current) => ({ ...current, [field]: value }));
  };

  const resetCompanyForm = () => {
    setIsCompanyFormOpen(false);
    setEditingCompanyId("");
    setCompanyForm(emptyCompanyForm);
  };

  const startAddingCompany = () => {
    setIsCompanyFormOpen(true);
    setEditingCompanyId("");
    setCompanyForm(emptyCompanyForm);
  };

  const startEditingCompany = (company) => {
    setIsCompanyFormOpen(true);
    setEditingCompanyId(company.id);
    setCompanyForm({
      companyName: company.companyName || "",
      address: company.address || "",
    });
  };

  const saveCompany = async (submitEvent) => {
    submitEvent.preventDefault();
    if (isOffline) {
      showToast("Editing is disabled while offline.", { variant: "error" });
      return;
    }
    if (!canManageCompanies) {
      showToast("Your role cannot manage companies.", { variant: "error" });
      return;
    }
    if (!selectedClientId) {
      showToast("Choose a client before adding companies.", { variant: "error" });
      return;
    }

    setSavingCompany(true);

    try {
      const companyName = companyForm.companyName.trim();
      const address = companyForm.address.trim();
      if (!companyName) {
        showToast("Company name is required.", { variant: "error" });
        return;
      }

      if (editingCompanyId) {
        await updateCompany(editingCompanyId, {
          clientId: selectedClientId,
          companyName,
          address,
        });
        showToast("Company saved.", { variant: "success" });
      } else {
        await createCompany({
          clientId: selectedClientId,
          companyName,
          address,
        });
        showToast("Company created.", { variant: "success" });
      }

      resetCompanyForm();
      await loadCompanies(selectedClientId);
    } catch (companyError) {
      console.error(companyError);
      showToast("Could not save company.", { variant: "error" });
    } finally {
      setSavingCompany(false);
    }
  };

  const removeCompany = async (companyId) => {
    if (isOffline) {
      showToast("Editing is disabled while offline.", { variant: "error" });
      return;
    }
    if (!canManageCompanies) {
      showToast("Your role cannot manage companies.", { variant: "error" });
      return;
    }

    setDeletingCompanyId(companyId);

    try {
      await deleteCompany(companyId);
      if (editingCompanyId === companyId) resetCompanyForm();
      await loadCompanies(selectedClientId);
      showToast("Company deleted.", { variant: "success" });
    } catch (companyError) {
      console.error(companyError);
      showToast("Could not delete company.", { variant: "error" });
    } finally {
      setDeletingCompanyId("");
    }
  };

  if (profileLoading) {
    return (
      <Loading
        label="Loading companies..."
        withToast
        id="companies-page-initial-load"
        showAfterMs={250}
      />
    );
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Companies</h1>
        </div>
      </div>

      {isOffline ? (
        <p className="message offline-message">Offline mode: company records are read-only.</p>
      ) : null}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{selectedClient?.clientName || "Companies"}</h2>
          </div>
          <div className="company-toolbar">
            {isSuperAdmin ? (
              <div className="form-row company-client-select">
                <label htmlFor="companyClientId">Client</label>
                <select
                  id="companyClientId"
                  value={selectedClientId}
                  disabled={clientsLoading}
                  onChange={(event) => setSelectedClientId(event.target.value)}
                >
                  <option value="">Choose a client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.clientName}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {canManageCompanies ? (
              <button
                className="button"
                type="button"
                disabled={isOffline || !selectedClientId}
                onClick={startAddingCompany}
              >
                Add company
              </button>
            ) : null}
          </div>
        </div>

        {companies.length === 0 ? (
          <p className="item-meta">No companies yet.</p>
        ) : (
          <div className="company-list">
            {companies.map((company) => (
              <div className="company-list-row" key={company.id}>
                <div>
                  <h3>{company.companyName}</h3>
                  <p className="item-meta company-address">
                    {company.address || "No address"}
                  </p>
                </div>
                {canManageCompanies ? (
                  <div className="company-list-actions">
                    <button
                      className="compact-button"
                      type="button"
                      disabled={isOffline}
                      onClick={() => startEditingCompany(company)}
                    >
                      Edit
                    </button>
                    <button
                      className="compact-button"
                      type="button"
                      disabled={deletingCompanyId === company.id || isOffline}
                      onClick={() => removeCompany(company.id)}
                    >
                      {deletingCompanyId === company.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {canManageCompanies && isCompanyFormOpen ? (
          <Modal
            title={editingCompanyId ? "Edit company" : "Add company"}
            subtitle={selectedClient?.clientName || "Company record"}
            labelledBy="companyFormTitle"
            closeLabel="Close company form"
            onClose={resetCompanyForm}
          >
          <form className="company-form" onSubmit={saveCompany}>
            <div className="form-grid">
              <div className="form-row">
                <label htmlFor="companyName">Company name</label>
                <input
                  id="companyName"
                  value={companyForm.companyName}
                  disabled={savingCompany || isOffline || !selectedClientId}
                  onChange={(event) =>
                    updateCompanyFormField("companyName", event.target.value)
                  }
                  placeholder="Company name"
                  required
                />
              </div>
              <div className="form-row full">
                <label htmlFor="companyAddress">Address</label>
                <textarea
                  id="companyAddress"
                  value={companyForm.address}
                  disabled={savingCompany || isOffline || !selectedClientId}
                  onChange={(event) => updateCompanyFormField("address", event.target.value)}
                  placeholder="Company address"
                  rows="4"
                />
              </div>
            </div>
            <div className="actions">
              <button
                className="button"
                type="submit"
                disabled={savingCompany || isOffline || !selectedClientId}
              >
                {savingCompany
                  ? "Saving..."
                  : editingCompanyId
                    ? "Save company"
                    : "Create company"}
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={savingCompany || isOffline}
                onClick={resetCompanyForm}
              >
                Cancel
              </button>
            </div>
          </form>
          </Modal>
        ) : null}
      </section>
    </main>
  );
}
