from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("usuarios", "0002_perfiloperario_data_admissao_perfiloperario_endereco")]

    operations = [
        migrations.AddField(
            model_name="perfilgerente",
            name="tipo_gerente",
            field=models.CharField(blank=True, max_length=80),
        ),
        migrations.AddField(
            model_name="perfiloperario",
            name="tipo_vinculo",
            field=models.CharField(
                choices=[("PROPRIO", "Próprio"), ("TERCEIRIZADO", "Terceirizado")],
                default="PROPRIO",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="perfiloperario",
            name="empresa_terceirizada",
            field=models.CharField(blank=True, max_length=150),
        ),
    ]
