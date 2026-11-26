using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using IdentityService.Api.Setup;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using OpenIddict.Server;

namespace IdentityService.ProtocolTests;

public sealed class OpenIddictCertificateExtensionsTests : IDisposable
{
    private const string SigningPassword = "senha-assinatura";
    private const string EncryptionPassword = "senha-criptografia";
    private static readonly DateTimeOffset Now = new(2026, 11, 26, 12, 0, 0, TimeSpan.Zero);

    private readonly string _directory = Directory.CreateTempSubdirectory("agenza-certs-").FullName;

    public void Dispose() => Directory.Delete(_directory, recursive: true);

    [Fact]
    public void Registra_os_certificados_de_assinatura_e_criptografia_configurados()
    {
        var signing = CreatePfx("signing", SigningPassword, X509KeyUsageFlags.DigitalSignature);
        var encryption = CreatePfx("encryption", EncryptionPassword, X509KeyUsageFlags.KeyEncipherment);

        var options = Register(Configure(signing, SigningPassword, encryption, EncryptionPassword));

        options.SigningCredentials.Should().ContainSingle();
        options.EncryptionCredentials.Should().ContainSingle();
    }

    [Fact]
    public void Aceita_certificado_sem_extensao_de_uso_da_chave()
    {
        var signing = CreatePfx("signing", SigningPassword, usage: null);
        var encryption = CreatePfx("encryption", EncryptionPassword, usage: null);

        var act = () => Register(Configure(signing, SigningPassword, encryption, EncryptionPassword));

        act.Should().NotThrow();
    }

    [Theory]
    [InlineData("Identity:Certificates:Signing:Path")]
    [InlineData("Identity:Certificates:Signing:Password")]
    [InlineData("Identity:Certificates:Encryption:Path")]
    [InlineData("Identity:Certificates:Encryption:Password")]
    public void Falha_quando_falta_configuracao_e_nomeia_a_chave(string key)
    {
        var configuration = Configure(
            CreatePfx("signing", SigningPassword, X509KeyUsageFlags.DigitalSignature),
            SigningPassword,
            CreatePfx("encryption", EncryptionPassword, X509KeyUsageFlags.KeyEncipherment),
            EncryptionPassword);
        configuration[key] = null;

        var act = () => Register(configuration);

        act.Should().Throw<InvalidOperationException>().WithMessage($"*'{key}'*");
    }

    [Fact]
    public void Falha_quando_o_arquivo_nao_existe()
    {
        var configuration = Configure(
            Path.Combine(_directory, "inexistente.pfx"),
            SigningPassword,
            CreatePfx("encryption", EncryptionPassword, X509KeyUsageFlags.KeyEncipherment),
            EncryptionPassword);

        var act = () => Register(configuration);

        act.Should().Throw<InvalidOperationException>().WithMessage("*Signing:Path*not found*");
    }

    [Fact]
    public void Falha_sem_revelar_a_senha_quando_a_senha_esta_errada()
    {
        var signing = CreatePfx("signing", SigningPassword, X509KeyUsageFlags.DigitalSignature);
        var encryption = CreatePfx("encryption", EncryptionPassword, X509KeyUsageFlags.KeyEncipherment);
        const string wrongPassword = "senha-incorreta";

        var act = () => Register(Configure(signing, wrongPassword, encryption, EncryptionPassword));

        var exception = act.Should().Throw<InvalidOperationException>().WithMessage("*wrong password*").Which;
        exception.ToString().Should().NotContain(wrongPassword).And.NotContain(SigningPassword);
    }

    [Fact]
    public void Falha_quando_o_arquivo_nao_e_um_pfx()
    {
        var invalid = Path.Combine(_directory, "invalido.pfx");
        File.WriteAllText(invalid, "nao e um pfx");
        var encryption = CreatePfx("encryption", EncryptionPassword, X509KeyUsageFlags.KeyEncipherment);

        var act = () => Register(Configure(invalid, SigningPassword, encryption, EncryptionPassword));

        act.Should().Throw<InvalidOperationException>().WithMessage("*Signing:Path*could not be loaded*");
    }

    [Fact]
    public void Falha_quando_o_certificado_nao_tem_chave_privada()
    {
        var publicOnly = CreatePfx(
            "signing",
            SigningPassword,
            X509KeyUsageFlags.DigitalSignature,
            withPrivateKey: false);
        var encryption = CreatePfx("encryption", EncryptionPassword, X509KeyUsageFlags.KeyEncipherment);

        var act = () => Register(Configure(publicOnly, SigningPassword, encryption, EncryptionPassword));

        act.Should().Throw<InvalidOperationException>().WithMessage("*Signing:Path*RSA private key*");
    }

    [Fact]
    public void Falha_quando_o_certificado_esta_vencido()
    {
        var expired = CreatePfx(
            "signing",
            SigningPassword,
            X509KeyUsageFlags.DigitalSignature,
            notAfter: Now.AddDays(-1));
        var encryption = CreatePfx("encryption", EncryptionPassword, X509KeyUsageFlags.KeyEncipherment);

        var act = () => Register(Configure(expired, SigningPassword, encryption, EncryptionPassword));

        act.Should().Throw<InvalidOperationException>().WithMessage("*Signing:Path*validity period*");
    }

    [Fact]
    public void Falha_quando_o_certificado_ainda_nao_e_valido()
    {
        var future = CreatePfx(
            "encryption",
            EncryptionPassword,
            X509KeyUsageFlags.KeyEncipherment,
            notBefore: Now.AddDays(1));
        var signing = CreatePfx("signing", SigningPassword, X509KeyUsageFlags.DigitalSignature);

        var act = () => Register(Configure(signing, SigningPassword, future, EncryptionPassword));

        act.Should().Throw<InvalidOperationException>().WithMessage("*Encryption:Path*validity period*");
    }

    [Fact]
    public void Falha_quando_o_uso_da_chave_nao_serve_para_assinatura()
    {
        var wrongUsage = CreatePfx("signing", SigningPassword, X509KeyUsageFlags.KeyEncipherment);
        var encryption = CreatePfx("encryption", EncryptionPassword, X509KeyUsageFlags.KeyEncipherment);

        var act = () => Register(Configure(wrongUsage, SigningPassword, encryption, EncryptionPassword));

        act.Should().Throw<InvalidOperationException>().WithMessage("*Signing:Path*key usage*signing*");
    }

    [Fact]
    public void Falha_quando_o_uso_da_chave_nao_serve_para_criptografia()
    {
        var signing = CreatePfx("signing", SigningPassword, X509KeyUsageFlags.DigitalSignature);
        var wrongUsage = CreatePfx("encryption", EncryptionPassword, X509KeyUsageFlags.DigitalSignature);

        var act = () => Register(Configure(signing, SigningPassword, wrongUsage, EncryptionPassword));

        act.Should().Throw<InvalidOperationException>().WithMessage("*Encryption:Path*key usage*encryption*");
    }

    [Fact]
    public void Falha_quando_o_certificado_de_criptografia_so_permite_cifrar_dados()
    {
        var signing = CreatePfx("signing", SigningPassword, X509KeyUsageFlags.DigitalSignature);
        var dataOnly = CreatePfx("encryption", EncryptionPassword, X509KeyUsageFlags.DataEncipherment);

        var act = () => Register(Configure(signing, SigningPassword, dataOnly, EncryptionPassword));

        act.Should().Throw<InvalidOperationException>().WithMessage("*Encryption:Path*key usage*encryption*");
    }

    [Fact]
    public void Falha_quando_assinatura_e_criptografia_sao_o_mesmo_certificado()
    {
        var shared = CreatePfx("shared", SigningPassword, usage: null);

        var act = () => Register(Configure(shared, SigningPassword, shared, SigningPassword));

        act.Should().Throw<InvalidOperationException>().WithMessage("*must be different certificates*");
    }

    private static OpenIddictServerOptions Register(IConfiguration configuration)
    {
        var services = new ServiceCollection().AddOptions();
        new OpenIddictServerBuilder(services).AddConfiguredCertificates(configuration, new FixedTimeProvider(Now));
        using var provider = services.BuildServiceProvider();
        return provider.GetRequiredService<IOptions<OpenIddictServerOptions>>().Value;
    }

    private static IConfigurationRoot Configure(
        string signingPath,
        string signingPassword,
        string encryptionPath,
        string encryptionPassword) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Identity:Certificates:Signing:Path"] = signingPath,
                ["Identity:Certificates:Signing:Password"] = signingPassword,
                ["Identity:Certificates:Encryption:Path"] = encryptionPath,
                ["Identity:Certificates:Encryption:Password"] = encryptionPassword,
            })
            .Build();

    private string CreatePfx(
        string name,
        string password,
        X509KeyUsageFlags? usage,
        bool withPrivateKey = true,
        DateTimeOffset? notBefore = null,
        DateTimeOffset? notAfter = null)
    {
        using var rsa = RSA.Create(2048);
        var request = new CertificateRequest($"CN=agenza-{name}", rsa, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        if (usage is not null)
        {
            request.CertificateExtensions.Add(new X509KeyUsageExtension(usage.Value, critical: true));
        }

        using var certificate = request.CreateSelfSigned(
            notBefore ?? Now.AddDays(-30),
            notAfter ?? Now.AddDays(365));

        var path = Path.Combine(_directory, $"{name}-{Guid.NewGuid():N}.pfx");
        if (withPrivateKey)
        {
            File.WriteAllBytes(path, certificate.Export(X509ContentType.Pfx, password));
        }
        else
        {
            using var publicOnly = X509CertificateLoader.LoadCertificate(certificate.Export(X509ContentType.Cert));
            File.WriteAllBytes(path, publicOnly.Export(X509ContentType.Pfx, password));
        }

        return path;
    }

    private sealed class FixedTimeProvider(DateTimeOffset utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => utcNow;
    }
}
