import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider.jsx";
import Loading from "../components/Loading.jsx";
import Modal from "../components/Modal.jsx";
import { CapcomIcon } from "../icons/capcomIcons.jsx";
import useOnlineStatus from "../hooks/useOnlineStatus.js";
import { getClient, getClients } from "../services/clientService.js";
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
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [companies, setCompanies] = useState([]);
  const [companyForm, setCompanyForm] = useState(emptyCompanyForm);
  const [isCompanyFormOpen, setIsCompanyFormOpen] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState("");
  const [clientsLoading, setClientsLoading] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [deletingCompanyId, setDeletingCompanyId] = useState("");
  const [companyMessage, setCompanyMessage] = useState("");
  const [companyError, setCompanyError] = useState("");
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
        setCompanyError("Could not load clients.");
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

    setCompanyError("");
    try {
      setCompanies(await getCompanies(clientId));
    } catch (loadError) {
      console.error(loadError);
      setCompanyError("Could not load companies.");
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
    setCompanyMessage("");
    setCompanyError("");
    setIsCompanyFormOpen(true);
    setEditingCompanyId("");
    setCompanyForm(emptyCompanyForm);
  };

  const startEditingCompany = (company) => {
    setCompanyMessage("");
    setCompanyError("");
    setIsCompanyFormOpen(true);
    setEditingCompanyId(company.id);
    setCompanyForm({
      companyName: company.companyName || "",
      address: company.address || "",
    });
  };

  const saveCompany = async (submitEvent) => {
    submitEvent.preventDefault();
    setCompanyMessage("");
    setCompanyError("");
    if (isOffline) {
      setCompanyError("Editing is disabled while offline.");
      return;
    }
    if (!canManageCompanies) {
      setCompanyError("Your role cannot manage companies.");
      return;
    }
    if (!selectedClientId) {
      setCompanyError("Choose a client before adding companies.");
      return;
    }

    setSavingCompany(true);

    try {
      const companyName = companyForm.companyName.trim();
      const address = companyForm.address.trim();
      if (!companyName) {
        setCompanyError("Company name is required.");
        return;
      }

      if (editingCompanyId) {
        await updateCompany(editingCompanyId, {
          clientId: selectedClientId,
          companyName,
          address,
        });
        setCompanyMessage("Company saved.");
      } else {
        await createCompany({
          clientId: selectedClientId,
          companyName,
          address,
        });
        setCompanyMessage("Company created.");
      }

      resetCompanyForm();
      await loadCompanies(selectedClientId);
    } catch (companyError) {
      console.error(companyError);
      setCompanyError("Could not save company.");
    } finally {
      setSavingCompany(false);
    }
  };

  const removeCompany = async (companyId) => {
    if (isOffline) {
      setCompanyError("Editing is disabled while offline.");
      return;
    }
    if (!canManageCompanies) {
      setCompanyError("Your role cannot manage companies.");
      return;
    }

    setCompanyMessage("");
    setCompanyError("");
    setDeletingCompanyId(companyId);

    try {
      await deleteCompany(companyId);
      if (editingCompanyId === companyId) resetCompanyForm();
      await loadCompanies(selectedClientId);
      setCompanyMessage("Company deleted.");
    } catch (companyError) {
      console.error(companyError);
      setCompanyError("Could not delete company.");
    } finally {
      setDeletingCompanyId("");
    }
  };

  if (profileLoading) {
    return <Loading />;
  }

  return (
    <main className="page">
      {isOffline ? (
        <p className="message offline-message">Offline mode: company records are read-only.</p>
      ) : null}
      {companyError ? <p className="error">{companyError}</p> : null}
      {companyMessage ? <p className="message">{companyMessage}</p> : null}

      <section className="panel">
        <div className="panel-heading">
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
                aria-label="Add company"
                disabled={isOffline || !selectedClientId}
                onClick={startAddingCompany}
              >
                <CapcomIcon name="add" size={18} weight="bold" />
                <span className="button-label">Add company</span>
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
                <div className="company-list-main">
                  <h3>{company.companyName}</h3>
                  {company.address ? (
                    <p className="item-meta company-address">{company.address}</p>
                  ) : null}
                </div>
                {canManageCompanies ? (
                  <div className="company-list-actions">
                    <button
                      className="compact-button company-icon-button"
                      type="button"
                      aria-label={`Edit ${company.companyName}`}
                      disabled={isOffline}
                      onClick={() => startEditingCompany(company)}
                    >
                      <CapcomIcon name="edit" size={18} weight="bold" />
                    </button>
                    <button
                      className="compact-button company-icon-button"
                      type="button"
                      aria-label={
                        deletingCompanyId === company.id
                          ? `Deleting ${company.companyName}`
                          : `Delete ${company.companyName}`
                      }
                      disabled={deletingCompanyId === company.id || isOffline}
                      onClick={() => removeCompany(company.id)}
                    >
                      <CapcomIcon name="delete" size={18} weight="bold" />
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
          {companyError ? <p className="error">{companyError}</p> : null}
          {companyMessage ? <p className="message">{companyMessage}</p> : null}
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
